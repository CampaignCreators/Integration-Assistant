import type {
  BriefRow,
  ExtractedSignalRow,
  RunRow,
  RunStatus,
  UploadRow,
} from "@cc/shared";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import type {
  HubSpotResult,
  MarketplaceResult,
  MiddlewareResult,
  TargetResult,
} from "../llm/schemas.js";
import { logEvent, runStep } from "./runner.js";
import { DECIDE_STEP, decideAndNarrate, type DecisionOutcome } from "./steps/decide.js";
import { EXTRACT_SIGNALS_STEP, extractSignals } from "./steps/extractSignals.js";
import {
  MAPPINGS_STEP,
  buildMappings,
  type MappingOutcome,
} from "./steps/buildMappings.js";
import { GENERATE_STEP, generateDeliverables } from "./steps/generate.js";
import {
  HUBSPOT_STEP,
  MARKETPLACE_STEP,
  MIDDLEWARE_STEP,
  TARGET_STEP,
  assessMiddleware,
  checkMarketplace,
  findExistingFinding,
  researchHubSpot,
  researchTarget,
} from "./steps/research.js";

/**
 * The run pipeline (spec §7.1).
 *
 * Two phases, separated by the rep's confirmation of the extracted signals
 * (spec §5.2 requires that check before research spends tokens):
 *
 *   extract  →  awaiting_confirmation  →  research  →  (generating: Phase 3)
 *
 * `runExtractionPhase` is entered from `queued`; `runResearchPhase` is entered
 * when the rep confirms. Both are resumable: each step skips itself if its
 * output is already persisted for the run.
 */

export interface RunBundle {
  run: RunRow;
  brief: BriefRow | null;
  uploads: UploadRow[];
}

export async function loadRun(runId: string): Promise<RunBundle> {
  const [runResult, briefResult, uploadsResult] = await Promise.all([
    supabase.from("runs").select("*").eq("id", runId).single(),
    supabase.from("brief").select("*").eq("run_id", runId).maybeSingle(),
    supabase.from("uploads").select("*").eq("run_id", runId).order("created_at"),
  ]);
  if (runResult.error || !runResult.data) {
    throw new Error(runResult.error?.message ?? "Run not found");
  }
  return {
    run: runResult.data as RunRow,
    brief: (briefResult.data as BriefRow | null) ?? null,
    uploads: (uploadsResult.data as UploadRow[] | null) ?? [],
  };
}

async function setStatus(
  runId: string,
  status: RunStatus,
  errorMessage?: string | null
): Promise<void> {
  const { error } = await supabase
    .from("runs")
    .update({ status, error_message: errorMessage ?? null })
    .eq("id", runId);
  if (error) {
    logger.error({ err: error.message, runId, status }, "failed to update run status");
  }
}

/** Phase 1: read the uploaded material, then hand back to the rep. */
export async function runExtractionPhase(runId: string): Promise<void> {
  const ctx = { runId };
  try {
    const { run, brief, uploads } = await loadRun(runId);
    await logEvent(runId, "pipeline", "started", "Reading your discovery material");

    await runStep(ctx, EXTRACT_SIGNALS_STEP, {
      hasResult: async () => {
        const { count } = await supabase
          .from("extracted_signals")
          .select("id", { count: "exact", head: true })
          .eq("run_id", runId);
        return count && count > 0 ? { signalCount: count, conflicts: [] } : null;
      },
      execute: () => extractSignals(run, brief, uploads),
    });

    await setStatus(runId, "awaiting_confirmation");
    await logEvent(
      runId,
      "pipeline",
      "succeeded",
      "Ready for your review before research begins"
    );
  } catch (err) {
    await failRun(runId, err);
  }
}

/** Phase 2: the research workflow, run after the rep confirms. */
export async function runResearchPhase(runId: string): Promise<void> {
  const ctx = { runId };
  try {
    const { run, brief } = await loadRun(runId);
    await setStatus(runId, "researching");
    await logEvent(runId, "pipeline", "started", "Researching both systems");

    const signals = await loadConfirmedSignals(runId);

    // HubSpot and target research are independent; the marketplace check is
    // too. Running them together cuts a multi-minute run down substantially.
    const [hubspot, target, marketplace] = await Promise.all([
      runStep<HubSpotResult>(ctx, HUBSPOT_STEP, {
        hasResult: () => findExistingFinding<HubSpotResult>(runId, "hubspot"),
        execute: () => researchHubSpot(run, brief, signals),
      }),
      runStep<TargetResult>(ctx, TARGET_STEP, {
        hasResult: () => findExistingFinding<TargetResult>(runId, "target"),
        execute: () => researchTarget(run, brief, signals),
      }),
      runStep<MarketplaceResult>(ctx, MARKETPLACE_STEP, {
        hasResult: () => findExistingFinding<MarketplaceResult>(runId, "marketplace"),
        execute: () => checkMarketplace(run, brief),
      }),
    ]);

    // Middleware depends on the target verdict, so it runs after.
    const middleware = await runStep<MiddlewareResult>(ctx, MIDDLEWARE_STEP, {
      hasResult: () => findExistingFinding<MiddlewareResult>(runId, "middleware"),
      execute: () => assessMiddleware(run, brief, target, marketplace),
    });

    await logEvent(runId, "pipeline", "progress", "Writing your documents");
    await setStatus(runId, "generating");
    await runOutputPhase(runId, { hubspot, target, marketplace, middleware });

    await logEvent(runId, "pipeline", "succeeded", "Your documents are ready");
    await setStatus(runId, "complete");
  } catch (err) {
    await failRun(runId, err);
  }
}

/**
 * Phase 3: decide the approach, build the mapping table, render both
 * deliverables. Split out so `POST /runs/:id/generate` can re-run just this
 * part after a reviewer edits the mappings.
 */
export async function runOutputPhase(
  runId: string,
  findings: {
    hubspot: HubSpotResult;
    target: TargetResult;
    marketplace: MarketplaceResult;
    middleware: MiddlewareResult;
  },
  options: { reuseDecision?: boolean } = {}
): Promise<void> {
  const ctx = { runId };
  const { run, brief } = await loadRun(runId);
  const signals = await loadConfirmedSignals(runId);

  const { decision, narrative } = await runStep<DecisionOutcome>(ctx, DECIDE_STEP, {
    hasResult: options.reuseDecision
      ? () => Promise.resolve(existingDecision(run))
      : undefined,
    execute: () => decideAndNarrate(run, brief, findings, signals),
  });

  // Re-read the run so the mapping sheet's "About" tab shows the approach.
  const { run: decided } = await loadRun(runId);

  const mapping = await runStep<MappingOutcome>(ctx, MAPPINGS_STEP, {
    execute: () => buildMappings(decided, brief, findings.hubspot, findings.target, decision.approach),
  });

  await runStep(ctx, GENERATE_STEP, {
    execute: () =>
      generateDeliverables({
        run: decided,
        brief,
        decision,
        narrative,
        findings,
        mappings: mapping.rows,
        matchStrategy: mapping.match_strategy,
        mappingGaps: mapping.gaps,
      }),
  });
}

/**
 * Rebuilds a stored decision so regenerating a document after a mapping edit
 * does not re-run (or re-charge for) the decision step.
 */
export function existingDecision(run: RunRow): DecisionOutcome | null {
  const details = run.approach_details_json;
  if (!run.recommended_approach || !run.confidence || !details?.narrative) {
    return null;
  }
  return {
    decision: {
      approach: run.recommended_approach,
      basis: details.basis,
      override_applied: details.override_applied,
      confidence: run.confidence,
      uncertainty_drivers: details.uncertainty_drivers,
      alternatives_considered: details.alternatives_considered,
    },
    narrative: details.narrative,
  };
}

async function failRun(runId: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ runId, err: message }, "run failed");
  await logEvent(runId, "pipeline", "failed", message);
  await setStatus(runId, "failed", message);
}

/**
 * Signals the rep kept, rendered for the research prompts. Anything flagged as
 * conflicting with the brief is excluded — the rep resolves those by editing
 * the brief, so feeding them to research would just re-introduce the conflict.
 */
async function loadConfirmedSignals(runId: string): Promise<string[]> {
  const { data } = await supabase
    .from("extracted_signals")
    .select("category, value, is_inferred, conflict_with_brief")
    .eq("run_id", runId)
    .eq("conflict_with_brief", false);

  return ((data as ExtractedSignalRow[] | null) ?? []).map(
    (signal) =>
      `- [${signal.category}] ${signal.value}${signal.is_inferred ? " (inferred)" : ""}`
  );
}
