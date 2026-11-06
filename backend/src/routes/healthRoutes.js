
import { Router } from "express";
import {
  getSystemHealth,
  getLiveness
} from "../controllers/healthController.js";

const router = Router();

router.get("/", getSystemHealth);
router.get("/live", getLiveness);

export default router;
