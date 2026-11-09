import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import env from "../../../config/env.js";
import { TOKEN_TYPES } from "../constants/authConstants.js";

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateAccessToken = (employee) => {
  return jwt.sign(
    {
      sub: employee.id,
      role: employee.role,
      departmentId: employee.departmentId ?? null,
      authVersion: employee.authVersion,
      type: TOKEN_TYPES.ACCESS,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: "vantage",
      audience: "vantage-client",
      jwtid: randomUUID(),
      algorithm: "HS256",
    }
  );
};

export const generateRefreshToken = (employee) => {
  return jwt.sign(
    {
      sub: employee.id,
      authVersion: employee.authVersion,
      type: TOKEN_TYPES.REFRESH,
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      issuer: "vantage",
      audience: "vantage-client",
      jwtid: randomUUID(),
      algorithm: "HS256",
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: "vantage",
    audience: "vantage-client",
    algorithms: ["HS256"],
  });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: "vantage",
    audience: "vantage-client",
    algorithms: ["HS256"],
  });
};

export const getTokenExpiry = (token) => {
  const decoded = jwt.decode(token);

  if (!decoded?.exp) {
    throw new Error("Token expiration is missing");
  }

  return new Date(decoded.exp * 1000);
};