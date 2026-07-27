import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}

/**
 * Structured request logging (spec §10 observability). Every response carries an
 * `x-request-id`, so an error a rep reports can be traced to the exact request
 * in the worker logs.
 */
export function requestLogging(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.header("x-request-id") ?? randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const payload = {
      requestId,
      method: req.method,
      // The route pattern rather than the path, so run ids do not fill the logs.
      route: req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.user?.id,
    };
    if (res.statusCode >= 500) {
      logger.error(payload, "request failed");
    } else if (res.statusCode >= 400) {
      logger.warn(payload, "request rejected");
    } else {
      logger.info(payload, "request");
    }
  });

  next();
}
