import type { RunRow } from "@cc/shared";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import { logEvent } from "../pipeline/runner.js";
import { resumeRun } from "../pipeline/processRun.js";

/**
 * Recovers runs whose worker died or was redeployed mid-run.
 *
 * Without this a crash leaves the run in a working state forever: the rep sees
 * a spinner that never resolves and nothing retries it. Because every pipeline
 * step skips itself when its output is already stored, resuming an orphan costs
 * only the steps that had not finished.
 *
 * The staleness threshold must exceed the slowest single step, and the claim is
 * an atomic UPDATE ... SKIP LOCKED, so two workers cannot both adopt the same
 * run and a genuinely-live run is never stolen.
 */
export async function recoverOrphanedRuns(
  onResume: (runId: string) => void
): Promise<number> {
  const staleAfter = `${config.staleRunMinutes} minutes`;

  const { data, error } = await supabase.rpc("claim_orphaned_runs", {
    stale_after: staleAfter,
  });
  if (error) {
    logger.error({ err: error.message }, "orphan recovery query failed");
    return 0;
  }

  const orphans = (data as RunRow[] | null) ?? [];
  for (const run of orphans) {
    logger.warn(
      { runId: run.id, status: run.status, heartbeatAt: run.heartbeat_at },
      "adopting orphaned run"
    );
    await logEvent(
      run.id,
      "pipeline",
      "progress",
      "Picking this up again after an interruption — finished steps are kept"
    );
    onResume(run.id);
  }
  return orphans.length;
}

/** Re-enters the pipeline at whichever phase the run had reached. */
export function resumeOrphan(runId: string): Promise<void> {
  return resumeRun(runId);
}
