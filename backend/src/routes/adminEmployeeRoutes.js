
import { Router } from "express";
import { createEmployeeAccount } from "../controllers/adminEmployeeController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/authorize.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.post("/employees", createEmployeeAccount);

export default router;
