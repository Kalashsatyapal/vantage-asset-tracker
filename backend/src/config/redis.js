
import IORedis from "ioredis";
import env from "../../../config/env.js";
import logger from "../../../config/logger.js";

const redis = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
  connectTimeout: 10000,
  retryStrategy(times) {
    return Math.min(times * 500, 5000);
  }
});

redis.on("connect", () => {
  logger.info("REDIS_CONNECTING");
});

redis.on("ready", () => {
  logger.info("REDIS_CONNECTION_READY");
});

redis.on("error", (error) => {
  logger.error("REDIS_CONNECTION_ERROR", {
    message: error.message
  });
});

redis.on("close", () => {
  logger.warn("REDIS_CONNECTION_CLOSED");
});

redis.on("reconnecting", (delay) => {
  logger.warn("REDIS_RECONNECTING", { delay });
});

export const connectRedis = async () => {
  if (redis.status === "wait") {
    await redis.connect();
  }

  await redis.ping();

  logger.info("REDIS_CONNECTION_ESTABLISHED");

  return true;
};

export const checkRedisHealth = async () => {
  try {
    const response = await redis.ping();

    return {
      status: response === "PONG" ? "healthy" : "unhealthy"
    };
  } catch (error) {
    logger.error("REDIS_HEALTH_CHECK_FAILED", {
      message: error.message
    });

    return {
      status: "unhealthy"
    };
  }
};

export const disconnectRedis = async () => {
  if (redis.status !== "end") {
    await redis.quit();
    logger.info("REDIS_CONNECTION_CLOSED");
  }
};

export default redis;
