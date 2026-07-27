import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";

/**
 * Postgres-backed job queue. `claim_next_run()` claims the oldest queued run
 * atomically (FOR UPDATE SKIP LOCKED), so several worker instances can run
 * side by side without processing a run twice.
 *
 * The pipeline itself lands in Phase 2. Until then this loop deliberately does
 * NOT claim anything: submitted runs stay `queued` — which is the truth — and
 * will be picked up as soon as the pipeline exists. It logs the backlog so the
 * wait is visible in the worker logs.
 */
export function startPoller(): void {
  let stopped = false;
  let lastReportedBacklog = -1;

  async function tick(): Promise<void> {
    if (stopped) return;
    try {
      const { count, error } = await supabase
        .from("runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "queued");
      if (error) {
        logger.error({ err: error.message }, "failed to read queue depth");
      } else if (count !== null && count !== lastReportedBacklog) {
        lastReportedBacklog = count;
        if (count > 0) {
          logger.warn(
            { queued: count },
            "runs are waiting — the research pipeline arrives in Phase 2"
          );
        }
      }
    } catch (err) {
      logger.error({ err }, "poller tick failed");
    }
    setTimeout(tick, config.pollIntervalMs);
  }

  void tick();
  process.on("SIGTERM", () => {
    stopped = true;
  });
  logger.info({ intervalMs: config.pollIntervalMs }, "queue poller started");
}

export async function logEvent(
  runId: string,
  step: string,
  status: "started" | "progress" | "succeeded" | "failed" | "skipped",
  message?: string
): Promise<void> {
  const { error } = await supabase
    .from("run_events")
    .insert({ run_id: runId, step, status, message: message ?? null });
  if (error) {
    logger.error({ err: error.message, runId, step }, "failed to write run_event");
  }
}
