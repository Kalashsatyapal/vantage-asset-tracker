
import { randomUUID } from "node:crypto";
import logger from "../../../config/logger.js";

const sensitiveKeys = new Set([
  "authorization",
  "cookie",
  "password",
  "token",
  "refreshtoken",
  "access_token",
  "refresh_token"
]);

const redactHeaders = (headers) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(headers)) {
    sanitized[key] = sensitiveKeys.has(key.toLowerCase())
      ? "[REDACTED]"
      : value;
  }

  return sanitized;
};

export const requestContext = (req, res, next) => {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;

  res.setHeader("X-Request-ID", requestId);

  logger.info("HTTP_REQUEST_STARTED", {
    requestId,
    method: req.method,
    path: req.originalUrl,
    headers: redactHeaders({
      "user-agent": req.headers["user-agent"]
    })
  });

  res.on("finish", () => {
    const durationMs =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info("HTTP_REQUEST_COMPLETED", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    });
  });

  next();
};
