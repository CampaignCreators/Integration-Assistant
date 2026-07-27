import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { startPoller } from "./queue/poller.js";
import { deliverablesRouter } from "./routes/deliverables.js";
import { mappingsRouter } from "./routes/mappings.js";
import { runsRouter } from "./routes/runs.js";
import { signalsRouter } from "./routes/signals.js";
import { uploadsRouter } from "./routes/uploads.js";

const app = express();

app.use(cors({ origin: config.webOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "cc-integration-worker" });
});

app.use("/runs", runsRouter);
app.use("/runs/:id", uploadsRouter);
app.use("/runs/:id", signalsRouter);
app.use("/runs/:id", deliverablesRouter);
app.use("/runs/:id", mappingsRouter);

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, "unhandled error");
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(config.port, () => {
  logger.info({ port: config.port }, "worker listening");
  startPoller();
});
