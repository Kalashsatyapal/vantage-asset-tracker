
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");

dotenv.config({
  path: path.join(projectRoot, ".env")
});

const requiredVariables = [
  "NODE_ENV",
  "PORT",
  "CLIENT_URL",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET"
];

const missingVariables = requiredVariables.filter(
  (key) =>
    process.env[key] === undefined ||
    process.env[key].trim() === ""
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing environment variables: ${missingVariables.join(", ")}`
  );
}

const port = Number(process.env.PORT);
const databasePort = Number(process.env.DB_PORT);
const bcryptRounds = Number(process.env.BCRYPT_ROUNDS || 12);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Invalid application port");
}

if (
  !Number.isInteger(databasePort) ||
  databasePort < 1 ||
  databasePort > 65535
) {
  throw new Error("Invalid database port");
}

if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
  throw new Error("BCRYPT_ROUNDS must be between 10 and 15");
}

if (
  process.env.JWT_SECRET.length < 32 ||
  process.env.JWT_REFRESH_SECRET.length < 32
) {
  throw new Error("JWT secrets must contain at least 32 characters");
}

if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT secrets must be different");
}

const allowedEnvironments = ["development", "test", "production"];

if (!allowedEnvironments.includes(process.env.NODE_ENV)) {
  throw new Error("Invalid NODE_ENV");
}

const cookieSameSite = (
  process.env.COOKIE_SAME_SITE || "strict"
).toLowerCase();

if (!["strict", "lax", "none"].includes(cookieSameSite)) {
  throw new Error("Invalid COOKIE_SAME_SITE");
}

const cookieSecure = process.env.COOKIE_SECURE === "true";

if (cookieSameSite === "none" && !cookieSecure) {
  throw new Error("SameSite=None requires secure cookies");
}

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV,
  PORT: port,
  CLIENT_URL: process.env.CLIENT_URL,
  PROJECT_ROOT: projectRoot,

  DB_HOST: process.env.DB_HOST,
  DB_PORT: databasePort,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  COOKIE_NAME: process.env.COOKIE_NAME || "Vantage_refresh",
  COOKIE_SECURE: cookieSecure,
  COOKIE_SAME_SITE: cookieSameSite,

  BCRYPT_ROUNDS: bcryptRounds,

  EXPORT_DIRECTORY: path.resolve(
    projectRoot,
    process.env.EXPORT_DIRECTORY || "exports"
  ),

  LOG_LEVEL: process.env.LOG_LEVEL || "info"
});

export default env;
