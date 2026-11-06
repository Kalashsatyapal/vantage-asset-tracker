
import logger from "../../../config/logger.js";

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = Number(error.statusCode || error.status || 500);

  const safeStatusCode =
    statusCode >= 400 && statusCode < 600
      ? statusCode
      : 500;

  logger.error("HTTP_APPLICATION_ERROR", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode: safeStatusCode,
    name: error.name,
    message: error.message,
    stack:
      process.env.NODE_ENV === "development"
        ? error.stack
        : undefined
  });

  res.status(safeStatusCode).json({
    success: false,
    message:
      safeStatusCode >= 500
        ? "Internal server error"
        : error.message,
    requestId: req.requestId
  });
};
