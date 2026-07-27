import type { RunRow } from "@cc/shared";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import { runExtractionPhase } from "../pipeline/processRun.js";

/**
 * Postgres-backed job queue. `claim_next_run()` claims the oldest queued run
 * atomically (FOR UPDATE SKIP LOCKED), so several worker instances can run side
 * by side without processing a run twice.
 *
 * Claiming moves the run to `extracting`, then the extraction phase parks it at
 * `awaiting_confirmation` for the rep. The research phase is triggered from the
 * confirm endpoint, not from here.
 */
export function startPoller(): void {
  let stopped = false;
  let inFlight = 0;

  async function tick(): Promise<void> {
    if (stopped) return;

    let claimed = false;
    try {
      if (inFlight < config.maxConcurrentRuns) {
        const { data, error } = await supabase.rpc("claim_next_run");
        if (error) {
          logger.error({ err: error.message }, "claim_next_run failed");
        } else {
          const run = (Array.isArray(data) ? data[0] : data) as RunRow | undefined;
          if (run) {
            claimed = true;
            inFlight += 1;
            void runExtractionPhase(run.id)
              .catch((err) => logger.error({ err, runId: run.id }, "run crashed"))
              .finally(() => {
                inFlight -= 1;
              });
          }
        }
      }
    } catch (err) {
      logger.error({ err }, "poller tick failed");
    }

    // Drain the queue promptly; idle at the configured interval.
    setTimeout(tick, claimed ? 50 : config.pollIntervalMs);
  }

  void tick();
  process.on("SIGTERM", () => {
    stopped = true;
  });
  logger.info(
    { intervalMs: config.pollIntervalMs, maxConcurrentRuns: config.maxConcurrentRuns },
    "queue poller started"
  );
}
