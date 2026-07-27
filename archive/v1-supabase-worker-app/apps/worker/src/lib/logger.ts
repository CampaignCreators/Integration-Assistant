import { destination, pino } from "pino";

/**
 * Structured logs to stdout, which is what a container host collects.
 *
 * The destination is synchronous on purpose. Pino buffers by default, and the
 * worker calls `process.exit` after draining on SIGTERM — with buffering, the
 * shutdown lines are truncated and a clean drain becomes indistinguishable from
 * a hard kill in the logs. Throughput is nowhere near where the buffering would
 * matter here.
 */
export const logger = pino(
  { level: process.env.LOG_LEVEL ?? "info" },
  destination({ dest: 1, sync: true })
);
