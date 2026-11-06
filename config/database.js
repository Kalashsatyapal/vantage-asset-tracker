
import "./env.js";
import { Sequelize } from "sequelize";
import logger from "./logger.js";

const requiredEnvironmentVariables = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD"
];

const missingVariables = requiredEnvironmentVariables.filter(
  (variable) => process.env[variable] === undefined
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing database environment variables: ${missingVariables.join(", ")}`
  );
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: "mysql",
    logging: (message) => logger.debug(message),
    benchmark: true,
    timezone: "+00:00",
    define: {
      timestamps: true,
      paranoid: true,
      version: true,
      underscored: true,
      freezeTableName: true
    },
    pool: {
      max: Number(process.env.DB_POOL_MAX || 20),
      min: Number(process.env.DB_POOL_MIN || 2),
      acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
      idle: Number(process.env.DB_POOL_IDLE || 10000),
      evict: Number(process.env.DB_POOL_EVICT || 1000)
    },
    retry: {
      max: 3,
      match: [
        /ETIMEDOUT/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /EHOSTUNREACH/,
        /PROTOCOL_CONNECTION_LOST/
      ]
    }
  }
);

sequelize.addHook("beforeDestroy", (instance, options) => {
  logger.info("DATABASE_SOFT_DELETE", {
    model: instance.constructor.name,
    primaryKey: instance.get(instance.constructor.primaryKeyAttribute),
    transactionId: options.transaction?.id || null
  });
});

sequelize.addHook("afterRestore", (instance) => {
  logger.info("DATABASE_RECORD_RESTORED", {
    model: instance.constructor.name,
    primaryKey: instance.get(instance.constructor.primaryKeyAttribute)
  });
});

sequelize.addHook("afterBulkDestroy", (options) => {
  logger.warn("DATABASE_BULK_SOFT_DELETE", {
    model: options.model?.name || "Unknown",
    transactionId: options.transaction?.id || null
  });
});

sequelize.addHook("afterBulkRestore", (options) => {
  logger.info("DATABASE_BULK_RESTORE", {
    model: options.model?.name || "Unknown",
    transactionId: options.transaction?.id || null
  });
});

export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();

    logger.info("DATABASE_CONNECTION_ESTABLISHED", {
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      dialect: "mysql"
    });

    return true;
  } catch (error) {
    logger.error("DATABASE_CONNECTION_FAILED", {
      message: error.message,
      name: error.name
    });

    throw error;
  }
};

export const disconnectDatabase = async () => {
  try {
    await sequelize.close();
    logger.info("DATABASE_CONNECTION_CLOSED");
  } catch (error) {
    logger.error("DATABASE_DISCONNECTION_FAILED", {
      message: error.message
    });

    throw error;
  }
};

export const checkDatabaseHealth = async () => {
  try {
    await sequelize.query("SELECT 1");

    return {
      status: "healthy",
      database: process.env.DB_NAME
    };
  } catch (error) {
    logger.error("DATABASE_HEALTH_CHECK_FAILED", {
      message: error.message
    });

    return {
      status: "unhealthy",
      database: process.env.DB_NAME
    };
  }
};

export default sequelize;
