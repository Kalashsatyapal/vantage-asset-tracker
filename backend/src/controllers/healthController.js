
import { checkDatabaseHealth } from "../../../config/database.js";
import { checkRedisHealth } from "../config/redis.js";
import { checkQueueHealth } from "../queues/queueRegistry.js";

export const getSystemHealth = async (req, res) => {
  const [database, redis, queues] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkQueueHealth()
  ]);

  const services = {
    database: database.status,
    redis: redis.status,
    queues: Object.values(queues).every(
      (status) => status === "healthy"
    )
      ? "healthy"
      : "unhealthy"
  };

  const healthy = Object.values(services).every(
    (status) => status === "healthy"
  );

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    application: "ASTRAVA",
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    services
  });
};

export const getLiveness = (req, res) => {
  res.status(200).json({
    success: true,
    application: "ASTRAVA",
    status: "alive",
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
};
