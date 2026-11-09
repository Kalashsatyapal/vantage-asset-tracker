
import { Router } from "express";

import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword
} from "../controllers/authController.js";

import { authenticate } from "../middleware/authenticate.js";
import { verifyClientOrigin } from "../middleware/verifyClientOrigin.js";
import {
  authRateLimiter
} from "../middleware/security.js";

const router = Router();

router.post("/register", authRateLimiter, register);

router.post("/login", authRateLimiter, login);

router.post(
  "/refresh",
  verifyClientOrigin,
  authRateLimiter,
  refresh
);

router.post(
  "/logout",
  verifyClientOrigin,
  logout
);

router.post(
  "/logout-all",
  verifyClientOrigin,
  authenticate,
  logoutAll
);

router.post(
  "/change-password",
  authenticate,
  authRateLimiter,
  changePassword
);

export default router;
