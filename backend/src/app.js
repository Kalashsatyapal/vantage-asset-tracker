import "../../config/env.js";
import express from "express";
import { securityHeaders, corsOptions, globalRateLimiter } from "./middleware/security.js";
import { requestContext } from "./middleware/requestContext.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/healthRoutes.js";

const app = express();

app.disable("x-powered-by");

app.set("trust proxy", process.env.TRUST_PROXY === "true");

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

app.use(globalRateLimiter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    application: "ASTRAVA",
    description: "Enterprise Asset Intelligence and Lifecycle Platform",
    version: "1.0.0",
    status: "operational",
    requestId: req.requestId
  });
});

app.use("/api/health", healthRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
