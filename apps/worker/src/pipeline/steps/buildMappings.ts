import {
  APPROACH_LABELS,
  type Approach,
  type BriefRow,
  type FieldMappingRow,
  type RunRow,
} from "@cc/shared";
import { runStructuredStep } from "../../llm/client.js";
import { mappingsPrompt } from "../../llm/prompts.js";
import {
  mappingsJsonSchema,
  mappingsSchema,
  type HubSpotResult,
  type MappingsResult,
  type TargetResult,
} from "../../llm/schemas.js";
import { submitTool } from "../../llm/tools.js";
import { supabase } from "../../lib/supabase.js";
import { recordUsage } from "../runner.js";

export const MAPPINGS_STEP = "build_mappings";

export interface MappingOutcome {
  rows: FieldMappingRow[];
  match_strategy: string;
  gaps: string[];
}

/**
 * Builds the data mapping table from the research findings (spec §5.5.2).
 *
 * Unknowns are preserved rather than filled in: a row the research could not
 * establish keeps UNKNOWN and its explanation, so a reviewer can see exactly
 * what to finish. Direction is clamped to the brief so a one-way integration
 * cannot contain two-way rows.
 */
export async function buildMappings(
  run: RunRow,
  brief: BriefRow | null,
  hubspot: HubSpotResult,
  target: TargetResult,
  approach: Approach
): Promise<MappingOutcome> {
  const { system, prompt } = mappingsPrompt(
    run,
    brief,
    hubspot,
    target,
    APPROACH_LABELS[approach]
  );

  const { data, usage } = await runStructuredStep({
    system,
    prompt,
    research: false,
    effort: "high",
    maxTokens: 32_000,
    submit: submitTool(
      "submit_mappings",
      "Report the field-by-field mapping table.",
      mappingsJsonSchema
    ),
    schema: mappingsSchema,
  });

  await recordUsage(run.id, MAPPINGS_STEP, usage);

  const rows = normalizeRows(data, run);

  // Replace rather than append, so a regenerate does not stack duplicate rows.
  await supabase.from("field_mappings").delete().eq("run_id", run.id);

  if (rows.length > 0) {
    const { error } = await supabase.from("field_mappings").insert(
      rows.map((row, index) => ({
        run_id: run.id,
        source_obj: row.source_obj,
        source_field: row.source_field,
        target_obj: row.target_obj,
        target_field: row.target_field,
        direction: row.direction,
        transform: row.transform,
        required: row.required,
        match_key: row.match_key,
        notes: row.notes,
        position: index,
      }))
    );
    if (error) throw new Error(`Failed to save field mappings: ${error.message}`);
  }

  const { data: saved, error: readError } = await supabase
    .from("field_mappings")
    .select("*")
    .eq("run_id", run.id)
    .order("position");
  if (readError) throw new Error(readError.message);

  return {
    rows: (saved as FieldMappingRow[] | null) ?? [],
    match_strategy: data.match_strategy,
    gaps: data.gaps,
  };
}

interface NormalizedRow {
  source_obj: string;
  source_field: string;
  target_obj: string;
  target_field: string;
  direction: "one_way" | "two_way";
  transform: string | null;
  required: boolean;
  match_key: boolean;
  notes: string | null;
}

/**
 * Qualifies object names with their system so a mapping row reads
 * unambiguously, and enforces the brief's direction on every row.
 */
export function normalizeRows(data: MappingsResult, run: RunRow): NormalizedRow[] {
  const twoWayAllowed = run.direction === "two_way";
  const targetName = run.target_software ?? "Target system";

  return data.rows.map((row) => {
    const sourceIsHubSpot = row.source_system === "hubspot";
    return {
      source_obj: qualify(row.source_obj, sourceIsHubSpot ? "HubSpot" : targetName),
      source_field: row.source_field,
      target_obj: qualify(row.target_obj, sourceIsHubSpot ? targetName : "HubSpot"),
      target_field: row.target_field,
      direction: twoWayAllowed ? row.direction : "one_way",
      transform: emptyToNull(row.transform),
      required: row.required,
      match_key: row.match_key,
      notes: emptyToNull(row.notes),
    };
  });
}

function qualify(objectName: string, system: string): string {
  const trimmed = objectName.trim();
  // Don't double-prefix if the model already named the system.
  if (trimmed.toLowerCase().startsWith(system.toLowerCase())) return trimmed;
  return `${system} · ${trimmed}`;
}

function emptyToNull(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "none" || trimmed === "-") return null;
  return trimmed;
}
