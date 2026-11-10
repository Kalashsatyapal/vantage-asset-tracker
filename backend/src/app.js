import "../../config/env.js";
import express from "express";
import cookieParser from "cookie-parser";
import {
  securityHeaders,
  corsOptions,
  globalRateLimiter
} from "./middleware/security.js";
import { requestContext } from "./middleware/requestContext.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import adminEmployeeRoutes from "./routes/adminEmployeeRoutes.js";
import assetLifecycleRoutes from "./routes/assetLifecycleRoutes.js";
import employeeOperationsRoutes from "./routes/employeeOperationsRoutes.js";
const app = express();
app.disable("x-powered-by");
app.set(
  "trust proxy",
  process.env.TRUST_PROXY === "true"
);
app.use("/api/employee-operations", employeeOperationsRoutes);
app.use("/api/assets", assetLifecycleRoutes);
app.use(securityHeaders);
app.use(corsOptions);
app.use(requestContext);
app.use(express.json({
  limit: "1mb",
  strict: true
}));
app.use(express.urlencoded({
  extended: false,
  limit: "1mb"
}));
app.use(cookieParser());
app.use(globalRateLimiter);
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    application: "Vantage",
    description: "Enterprise Asset Intelligence and Lifecycle Platform",
    version: "1.0.0",
    status: "operational",
    requestId: req.requestId
  });
});
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminEmployeeRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
