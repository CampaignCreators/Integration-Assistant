import type { FieldMappingRow } from "@cc/shared";
import { supabase } from "../lib/supabase.js";
import type {
  HubSpotResult,
  MarketplaceResult,
  MiddlewareResult,
  TargetResult,
} from "../llm/schemas.js";
import { existingDecision, loadRun } from "./processRun.js";
import { PermanentStepError, logEvent, runStep } from "./runner.js";
import { GENERATE_STEP, generateDeliverables } from "./steps/generate.js";
import { findExistingFinding } from "./steps/research.js";

/**
 * Rebuilds both deliverables from whatever is currently in the database
 * (spec §7: `POST /runs/:id/generate`).
 *
 * This deliberately does NOT re-run the mapping builder. The whole point of
 * regenerating is that a reviewer corrected the mapping rows by hand — asking
 * the model to rebuild them would throw those corrections away. The decision
 * and narrative are likewise reused from storage rather than re-charged for.
 */
export async function regenerateDeliverables(runId: string): Promise<void> {
  const ctx = { runId };
  const { run, brief } = await loadRun(runId);

  const outcome = existingDecision(run);
  if (!outcome) {
    throw new PermanentStepError(
      "This run has no recommendation yet, so there is nothing to regenerate. " +
        "Re-run the research instead."
    );
  }

  const findings = await loadAllFindings(runId);
  if (!findings) {
    throw new PermanentStepError(
      "The research findings for this run are missing, so the documents cannot be " +
        "rebuilt. Re-run the research instead."
    );
  }

  const { data: mappings, error } = await supabase
    .from("field_mappings")
    .select("*")
    .eq("run_id", runId)
    .order("position");
  if (error) throw new Error(error.message);

  const meta = run.mapping_meta_json;

  await logEvent(runId, "pipeline", "started", "Rebuilding your documents");
  await runStep(ctx, GENERATE_STEP, {
    execute: () =>
      generateDeliverables({
        run,
        brief,
        decision: outcome.decision,
        narrative: outcome.narrative,
        findings,
        mappings: (mappings as FieldMappingRow[] | null) ?? [],
        matchStrategy: meta?.match_strategy ?? "Not recorded for this run.",
        mappingGaps: meta?.gaps ?? [],
      }),
  });
  await logEvent(runId, "pipeline", "succeeded", "Your documents have been rebuilt");
}

/** All four findings, or null if any is missing. */
export async function loadAllFindings(runId: string): Promise<{
  hubspot: HubSpotResult;
  target: TargetResult;
  marketplace: MarketplaceResult;
  middleware: MiddlewareResult;
} | null> {
  const [hubspot, target, marketplace, middleware] = await Promise.all([
    findExistingFinding<HubSpotResult>(runId, "hubspot"),
    findExistingFinding<TargetResult>(runId, "target"),
    findExistingFinding<MarketplaceResult>(runId, "marketplace"),
    findExistingFinding<MiddlewareResult>(runId, "middleware"),
  ]);
  if (!hubspot || !target || !marketplace || !middleware) return null;
  return { hubspot, target, marketplace, middleware };
}
