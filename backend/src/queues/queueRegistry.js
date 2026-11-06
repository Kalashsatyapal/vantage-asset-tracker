
import { Queue, QueueEvents } from "bullmq";
import redis from "../config/redis.js";
import logger from "../../../config/logger.js";
import { defaultJobOptions, queueNames } from "./queueConfig.js";

const queueDefinitions = Object.entries(queueNames);

const queues = {};
const queueEvents = {};

for (const [key, name] of queueDefinitions) {
  const queue = new Queue(name, {
    connection: redis,
    defaultJobOptions
  });

  const events = new QueueEvents(name, {
    connection: redis.duplicate()
  });

  queue.on("error", (error) => {
    logger.error("BULLMQ_QUEUE_ERROR", {
      queue: name,
      message: error.message
    });
  });

  events.on("completed", ({ jobId, returnvalue }) => {
    logger.info("BULLMQ_JOB_COMPLETED", {
      queue: name,
      jobId,
      returnvalue
    });
  });

  events.on("failed", ({ jobId, failedReason }) => {
    logger.error("BULLMQ_JOB_FAILED", {
      queue: name,
      jobId,
      failedReason
    });
  });

  queues[key] = queue;
  queueEvents[key] = events;
}

export const assetTaskQueue = queues.ASSET_TASKS;
export const csvExportQueue = queues.CSV_EXPORTS;
export const notificationQueue = queues.NOTIFICATIONS;
export const maintenanceQueue = queues.MAINTENANCE;

export const getQueue = (queueName) => {
  const queue = queues[queueName];

  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  return queue;
};

export const checkQueueHealth = async () => {
  const results = {};

  for (const [key, queue] of Object.entries(queues)) {
    try {
      await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed"
      );

      results[key] = "healthy";
    } catch {
      results[key] = "unhealthy";
    }
  }

  return results;
};

export const closeQueues = async () => {
  await Promise.allSettled([
    ...Object.values(queueEvents).map((events) => events.close()),
    ...Object.values(queues).map((queue) => queue.close())
  ]);

  logger.info("BULLMQ_QUEUES_CLOSED");
};
