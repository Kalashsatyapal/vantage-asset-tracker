
import { checkDatabaseHealth } from "../../../config/database.js";

export const getSystemHealth = async (req, res) => {
  const database = await checkDatabaseHealth();

  const healthy = database.status === "healthy";

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    application: "ASTRAVA",
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    services: {
      database: database.status
    }
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
