import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  port: Number(process.env.PORT ?? 8080),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 3000),
  /** Cost/throughput cap (spec §10) — how many runs this worker processes at once. */
  maxConcurrentRuns: Number(process.env.MAX_CONCURRENT_RUNS ?? 3),
  /**
   * How long a working run may go without a heartbeat before another worker
   * treats it as orphaned. Must comfortably exceed the slowest single step, or
   * a live run could be picked up twice.
   */
  staleRunMinutes: Number(process.env.STALE_RUN_MINUTES ?? 20),
  /** How long to let in-flight runs finish on SIGTERM before exiting. */
  shutdownGraceMs: Number(process.env.SHUTDOWN_GRACE_MS ?? 25_000),
};
