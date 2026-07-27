import type { RunRow } from "@cc/shared";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";

/**
 * Postgres-backed job queue: claims the oldest `queued` run atomically
 * (FOR UPDATE SKIP LOCKED inside claim_next_run) and processes it.
 *
 * The actual pipeline lands in Phase 2 — for now a claimed run is failed
 * with an explanatory event, so nothing silently disappears.
 */
export function startPoller(): void {
  let stopped = false;

  async function tick(): Promise<void> {
    if (stopped) return;
    let claimed = false;
    try {
      const { data, error } = await supabase.rpc("claim_next_run");
      if (error) {
        logger.error({ err: error.message }, "claim_next_run failed");
      } else {
        const run = (Array.isArray(data) ? data[0] : data) as RunRow | undefined;
        if (run) {
          claimed = true;
          await processRun(run);
        }
      }
    } catch (err) {
      logger.error({ err }, "poller tick failed");
    }
    // Drain the queue quickly; idle at the configured interval.
    setTimeout(tick, claimed ? 0 : config.pollIntervalMs);
  }

  void tick();
  process.on("SIGTERM", () => {
    stopped = true;
  });
  logger.info({ intervalMs: config.pollIntervalMs }, "queue poller started");
}

async function processRun(run: RunRow): Promise<void> {
  logger.info({ runId: run.id }, "claimed run");
  await logEvent(run.id, "pipeline", "started", "Run claimed by worker");

  const message = "Pipeline not implemented yet (arrives in Phase 2)";
  await logEvent(run.id, "pipeline", "failed", message);
  await supabase
    .from("runs")
    .update({ status: "failed", error_message: message })
    .eq("id", run.id);
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
