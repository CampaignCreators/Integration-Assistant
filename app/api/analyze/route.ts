import { NextResponse } from "next/server";
import { ClaudeError, parseToolInput, resolveMode, runToolCall } from "@/lib/claude";
import { demoMapping, demoQuestions } from "@/lib/demo";
import {
  ANALYST_SYSTEM,
  REQUEST_MORE_INFO_TOOL,
  SUBMIT_MAPPING_TOOL,
  buildAnalyzePrompt,
} from "@/lib/prompt";
import {
  analyzeRequestSchema,
  mappingTableSchema,
  questionsSchema,
  type AnalyzeResult,
} from "@/lib/schemas";

/** Research plus drafting can run past a minute; Vercel needs telling. */
export const maxDuration = 300;

/**
 * Drafts the mapping table, or asks for what it needs first.
 *
 * Claude chooses between the two by calling one of two tools. After one round of
 * questions the choice is taken away: a second round would let it keep asking
 * instead of committing, and an assumption written down is more useful than a
 * question asked twice.
 */
const MAX_QUESTION_ROUNDS = 1;

export async function POST(request: Request) {
  const parsed = analyzeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }
  const input = parsed.data;
  const mode = resolveMode();

  if (mode === "misconfigured") {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Refusing to produce demo output in production.",
      },
      { status: 503 }
    );
  }

  if (mode === "demo") {
    // One round of questions, then a table — so the whole flow is exercised.
    const result: AnalyzeResult =
      input.round < MAX_QUESTION_ROUNDS && input.answers.length === 0
        ? { kind: "questions", questions: demoQuestions(), demo: true }
        : { kind: "mapping", mapping: demoMapping(input.target_software), demo: true };
    return NextResponse.json(result);
  }

  const finalRound = input.round >= MAX_QUESTION_ROUNDS;

  try {
    const call = await runToolCall({
      system: ANALYST_SYSTEM,
      prompt: buildAnalyzePrompt(input, finalRound),
      tools: finalRound
        ? [SUBMIT_MAPPING_TOOL]
        : [SUBMIT_MAPPING_TOOL, REQUEST_MORE_INFO_TOOL],
      force: finalRound ? SUBMIT_MAPPING_TOOL.name : undefined,
      research: true,
      maxTokens: 24_000,
    });

    if (call.tool === REQUEST_MORE_INFO_TOOL.name) {
      const questions = parseToolInput(questionsSchema, call.input, call.tool);
      const result: AnalyzeResult = { kind: "questions", questions, demo: false };
      return NextResponse.json(result);
    }

    const mapping = parseToolInput(mappingTableSchema, call.input, call.tool);
    const result: AnalyzeResult = { kind: "mapping", mapping, demo: false };
    return NextResponse.json(result);
  } catch (error) {
    console.error("analyze failed", error);
    const message =
      error instanceof ClaudeError
        ? error.message
        : "Could not draft the mapping. Check the server log and try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
