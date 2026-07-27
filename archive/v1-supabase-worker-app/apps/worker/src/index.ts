import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { supabase } from "./lib/supabase.js";
import { requestLogging } from "./middleware/logging.js";
import { drainPoller, inFlightCount, isStopping, startPoller } from "./queue/poller.js";
import { adminRouter } from "./routes/admin.js";
import { deliverablesRouter } from "./routes/deliverables.js";
import { mappingsRouter } from "./routes/mappings.js";
import { runsRouter } from "./routes/runs.js";
import { signalsRouter } from "./routes/signals.js";
import { uploadsRouter } from "./routes/uploads.js";

const app = express();

app.set("trust proxy", true);
app.use(cors({ origin: config.webOrigin, exposedHeaders: ["x-request-id"] }));
app.use(express.json({ limit: "1mb" }));
app.use(requestLogging);

/** Liveness: the process is up. Cheap, no dependencies. */
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "cc-integration-worker",
    stopping: isStopping(),
    in_flight_runs: inFlightCount(),
  });
});

/**
 * Readiness: the process can actually do its job. A host that routes traffic on
 * /health alone would send requests to a worker that cannot reach its database.
 */
app.get("/ready", async (_req, res) => {
  if (isStopping()) {
    res.status(503).json({ ready: false, reason: "shutting down" });
    return;
  }
  const { error } = await supabase
    .from("app_settings")
    .select("id", { head: true, count: "exact" })
    .limit(1);
  if (error) {
    logger.error({ err: error.message }, "readiness check failed");
    res.status(503).json({ ready: false, reason: "database unreachable" });
    return;
  }
  res.json({ ready: true });
});

app.use("/admin", adminRouter);
app.use("/runs", runsRouter);
app.use("/runs/:id", uploadsRouter);
app.use("/runs/:id", signalsRouter);
app.use("/runs/:id", deliverablesRouter);
app.use("/runs/:id", mappingsRouter);

app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error({ err, requestId: req.requestId }, "unhandled error");
    res.status(500).json({
      error: "Something went wrong on our side.",
      request_id: req.requestId,
    });
  }
);

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, "worker listening");
  startPoller();
});

/**
 * A container host sends SIGTERM on every deploy. Stop accepting connections,
 * let in-flight runs finish, then exit — anything still running when the grace
 * period expires is recovered by another worker via the heartbeat sweep.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "shutting down");
  server.close();
  await drainPoller();
  logger.info("shutdown complete");
  process.exit(0);
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

// A crash that leaves runs mid-flight is recoverable; one that silently
// continues in an unknown state is not.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  process.exit(1);
});
