import "../../config/env.js";
import http from "node:http";
import app from "./app.js";
import env from "../../config/env.js";
import logger from "../../config/logger.js";
import { connectDatabase, disconnectDatabase } from "../../config/database.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { closeQueues } from "./queues/queueRegistry.js";

const server = http.createServer(app);

let shuttingDown = false;

server.requestTimeout = 30000;
server.headersTimeout = 35000;
server.keepAliveTimeout = 5000;
server.maxRequestsPerSocket = 1000;

const startServer = async () => {
  try {
    await connectDatabase();
    await connectRedis();

    server.listen(env.PORT, () => {
      logger.info("ASTRAVA_SERVER_STARTED", {
        port: env.PORT,
        environment: env.NODE_ENV,
        pid: process.pid
      });
    });
  } catch (error) {
    logger.error("ASTRAVA_STARTUP_FAILED", {
      message: error.message,
      stack: error.stack
    });

    await Promise.allSettled([
      disconnectDatabase(),
      disconnectRedis(),
      closeQueues()
    ]);

    process.exitCode = 1;
  }
};

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  logger.warn("ASTRAVA_SHUTDOWN_STARTED", {
    signal
  });

  const forceShutdown = setTimeout(() => {
    logger.error("ASTRAVA_FORCE_SHUTDOWN");
    process.exit(1);
  }, 15000);

  forceShutdown.unref();

  try {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    await Promise.all([
      closeQueues(),
      disconnectDatabase(),
      disconnectRedis()
    ]);

    logger.info("ASTRAVA_SHUTDOWN_COMPLETED");

    clearTimeout(forceShutdown);
    process.exitCode = 0;
  } catch (error) {
    logger.error("ASTRAVA_SHUTDOWN_FAILED", {
      message: error.message
    });

    process.exitCode = 1;
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
  logger.error("ASTRAVA_UNCAUGHT_EXCEPTION", {
    message: error.message,
    stack: error.stack
  });

  shutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason) => {
  logger.error("ASTRAVA_UNHANDLED_REJECTION", {
    reason:
      reason instanceof Error
        ? reason.message
        : String(reason)
  });

  shutdown("UNHANDLED_REJECTION");
});

startServer();

export { server, shutdown };
