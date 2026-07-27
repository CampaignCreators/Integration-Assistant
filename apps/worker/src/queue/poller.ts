import type { RunRow } from "@cc/shared";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { maxConcurrentRuns } from "../lib/settings.js";
import { supabase } from "../lib/supabase.js";
import { runExtractionPhase } from "../pipeline/processRun.js";
import { recoverOrphanedRuns, resumeOrphan } from "./recovery.js";

/**
 * Postgres-backed job queue. `claim_next_run()` claims the oldest queued run
 * atomically (FOR UPDATE SKIP LOCKED), so several worker instances can run side
 * by side without processing a run twice.
 *
 * Claiming moves the run to `extracting`; the extraction phase then parks it at
 * `awaiting_confirmation` for the rep. The research phase is triggered by the
 * confirm endpoint, not from here.
 */

/** How often to look for runs abandoned by a dead worker. */
const RECOVERY_INTERVAL_MS = 60_000;

let inFlight = 0;
let stopping = false;

export function inFlightCount(): number {
  return inFlight;
}

export function isStopping(): boolean {
  return stopping;
}

function track(runId: string, work: () => Promise<void>): void {
  inFlight += 1;
  void work()
    .catch((err) => logger.error({ err, runId }, "run crashed"))
    .finally(() => {
      inFlight -= 1;
    });
}

export function startPoller(): void {
  async function tick(): Promise<void> {
    if (stopping) return;

    let claimed = false;
    try {
      const cap = await maxConcurrentRuns();
      if (inFlight < cap) {
        const { data, error } = await supabase.rpc("claim_next_run");
        if (error) {
          logger.error({ err: error.message }, "claim_next_run failed");
        } else {
          const run = (Array.isArray(data) ? data[0] : data) as RunRow | undefined;
          if (run) {
            claimed = true;
            logger.info({ runId: run.id }, "claimed run");
            track(run.id, () => runExtractionPhase(run.id));
          }
        }
      }
    } catch (err) {
      logger.error({ err }, "poller tick failed");
    }

    // Drain the queue promptly; idle at the configured interval.
    setTimeout(tick, claimed ? 50 : config.pollIntervalMs);
  }

  async function recoveryTick(): Promise<void> {
    if (stopping) return;
    try {
      const cap = await maxConcurrentRuns();
      if (inFlight < cap) {
        await recoverOrphanedRuns((runId) => track(runId, () => resumeOrphan(runId)));
      }
    } catch (err) {
      logger.error({ err }, "orphan recovery failed");
    }
    setTimeout(recoveryTick, RECOVERY_INTERVAL_MS);
  }

  void tick();
  // Sweep on startup too: a crash-restart's own runs are the likeliest orphans.
  void recoveryTick();

  logger.info(
    {
      intervalMs: config.pollIntervalMs,
      staleRunMinutes: config.staleRunMinutes,
    },
    "queue poller started"
  );
}

/**
 * Stops claiming new work and waits for in-flight runs to finish.
 *
 * A container host sends SIGTERM on every deploy. Exiting immediately would
 * abandon runs mid-research; they would be recovered eventually, but only after
 * the staleness window, and the partial step would be paid for twice.
 */
export async function drainPoller(): Promise<void> {
  stopping = true;
  const deadline = Date.now() + config.shutdownGraceMs;

  while (inFlight > 0 && Date.now() < deadline) {
    logger.info({ inFlight }, "waiting for in-flight runs to finish");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (inFlight > 0) {
    logger.warn(
      { inFlight },
      "shutdown grace expired; remaining runs will be recovered by another worker"
    );
  }
}
