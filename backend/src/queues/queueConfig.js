
export const defaultJobOptions = Object.freeze({
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 2000
  },
  removeOnComplete: {
    age: 86400,
    count: 10000
  },
  removeOnFail: {
    age: 604800,
    count: 20000
  }
});

export const queueNames = Object.freeze({
  ASSET_TASKS: "astrava-asset-tasks",
  CSV_EXPORTS: "astrava-csv-exports",
  NOTIFICATIONS: "astrava-notifications",
  MAINTENANCE: "astrava-maintenance"
});
