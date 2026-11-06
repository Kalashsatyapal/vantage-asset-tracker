
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import env from "../../../config/env.js";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests:
        env.NODE_ENV === "production" ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false
});

export const corsOptions = cors({
  origin(origin, callback) {
    if (!origin || origin === env.CLIENT_URL) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-ID"
  ],
  exposedHeaders: ["X-Request-ID"],
  credentials: true,
  maxAge: 86400
});

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later."
  }
});
