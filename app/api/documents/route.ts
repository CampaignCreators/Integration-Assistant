import { NextResponse } from "next/server";
import { ClaudeError, parseToolInput, resolveMode, runToolCall } from "@/lib/claude";
import { demoNarrative } from "@/lib/demo";
import { buildDocument, documentFilename } from "@/lib/documents";
import { SUBMIT_NARRATIVE_TOOL, WRITER_SYSTEM, buildNarrativePrompt } from "@/lib/prompt";
import { documentRequestSchema, narrativeSchema } from "@/lib/schemas";

export const maxDuration = 300;

/**
 * Generates one document from the confirmed mapping.
 *
 * The prose is written fresh here rather than at draft time, so it always
 * describes the table the user actually confirmed — including any edits they made
 * to it. The .docx itself is assembled in code, so the model never controls
 * document structure.
 */
export async function POST(request: Request) {
  const parsed = documentRequestSchema.safeParse(await request.json().catch(() => null));
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
      { error: "ANTHROPIC_API_KEY is not set. Refusing to write documents in production." },
      { status: 503 }
    );
  }

  try {
    let sources: string[] = [];
    let narrative;

    if (mode === "demo") {
      narrative = demoNarrative(input.target_software);
    } else {
      const call = await runToolCall({
        system: WRITER_SYSTEM,
        prompt: buildNarrativePrompt(input),
        tools: [SUBMIT_NARRATIVE_TOOL],
        force: SUBMIT_NARRATIVE_TOOL.name,
        research: false,
        maxTokens: 16_000,
      });
      narrative = parseToolInput(narrativeSchema, call.input, call.tool);
      sources = call.sources;
    }

    const buffer = await buildDocument({
      kind: input.kind,
      targetSoftware: input.target_software,
      useCase: input.use_case,
      mapping: input.mapping,
      narrative,
      answers: input.answers,
      sources,
      demo: mode === "demo",
      generatedAt: new Date(),
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${documentFilename(
          input.kind,
          input.target_software
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("document generation failed", error);
    const message =
      error instanceof ClaudeError
        ? error.message
        : "Could not generate the document. Check the server log and try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
