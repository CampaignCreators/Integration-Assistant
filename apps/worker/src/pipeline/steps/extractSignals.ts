import type { BriefRow, RunRow, UploadRow } from "@cc/shared";
import { runStructuredStep } from "../../llm/client.js";
import { extractSignalsPrompt } from "../../llm/prompts.js";
import { extractSignalsJsonSchema, extractSignalsSchema } from "../../llm/schemas.js";
import { submitTool } from "../../llm/tools.js";
import { supabase } from "../../lib/supabase.js";
import { recordUsage } from "../runner.js";

/** Cap per-file text so one enormous transcript can't crowd out the others. */
const MAX_CHARS_PER_FILE = 120_000;

export const EXTRACT_SIGNALS_STEP = "extract_signals";

export async function extractSignals(
  run: RunRow,
  brief: BriefRow | null,
  uploads: UploadRow[]
): Promise<{ signalCount: number; conflicts: string[] }> {
  const documents = uploads
    .filter((u) => u.status === "extracted" && u.extracted_text)
    .map((u) => ({
      filename: u.filename,
      text: truncate(u.extracted_text as string, MAX_CHARS_PER_FILE),
    }));

  const { system, prompt } = extractSignalsPrompt(run, brief, documents);
  const { data, usage } = await runStructuredStep({
    system,
    prompt,
    // No web search here — this step reads the rep's own material only.
    research: false,
    effort: "medium",
    maxTokens: 16_000,
    submit: submitTool(
      "submit_signals",
      "Report the structured signals extracted from the discovery material.",
      extractSignalsJsonSchema
    ),
    schema: extractSignalsSchema,
  });

  await recordUsage(run.id, EXTRACT_SIGNALS_STEP, usage);

  // Replace rather than append, so a reprocess does not duplicate signals.
  await supabase.from("extracted_signals").delete().eq("run_id", run.id);

  if (data.signals.length > 0) {
    const { error } = await supabase.from("extracted_signals").insert(
      data.signals.map((signal) => ({
        run_id: run.id,
        category: signal.category,
        value: signal.value,
        source_ref: signal.source_ref,
        is_inferred: signal.is_inferred,
        conflict_with_brief: signal.conflict_with_brief,
      }))
    );
    if (error) throw new Error(`Failed to save extracted signals: ${error.message}`);
  }

  // Conflicts are stored as signals too, so the confirmation UI has one source.
  if (data.conflicts.length > 0) {
    const { error } = await supabase.from("extracted_signals").insert(
      data.conflicts.map((conflict) => ({
        run_id: run.id,
        category: "constraint" as const,
        value: conflict,
        source_ref: null,
        is_inferred: true,
        conflict_with_brief: true,
      }))
    );
    if (error) throw new Error(`Failed to save conflicts: ${error.message}`);
  }

  return { signalCount: data.signals.length, conflicts: data.conflicts };
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n[...truncated for length...]`;
}
