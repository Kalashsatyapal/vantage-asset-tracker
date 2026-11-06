
import winston from "winston";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const projectRoot = path.resolve(currentDirectory, "..");
const logDirectory = path.join(projectRoot, "logs");

const logFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss.SSS"
  }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss"
  }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    const details =
      Object.keys(metadata).length > 0
        ? JSON.stringify(metadata)
        : "";

    return `${timestamp} [${level}]: ${message} ${details}`.trim();
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: {
    application: "ASTRAVA",
    environment: process.env.NODE_ENV || "development"
  },
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDirectory, "combined.log"),
      level: "info",
      maxsize: 10485760,
      maxFiles: 10,
      tailable: true,
      zippedArchive: true
    }),
    new winston.transports.File({
      filename: path.join(logDirectory, "errors.log"),
      level: "error",
      maxsize: 10485760,
      maxFiles: 10,
      tailable: true,
      zippedArchive: true
    }),
    new winston.transports.Console({
      level: process.env.CONSOLE_LOG_LEVEL || "debug",
      format: consoleFormat
    })
  ],
  exitOnError: false
});

export default logger;
