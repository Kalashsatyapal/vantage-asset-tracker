
import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  exportAssets,
  exportAllocations,
  exportAuditLogs,
  getOverdueAllocations,
  processOverdueAllocations
} from "../controllers/reportingController.js";

const router = Router();

router.use(authenticate);

router.get(
  "/exports/assets",
  authorize("ASSET_MANAGER", "ADMIN"),
  exportAssets
);

router.get(
  "/exports/allocations",
  authorize("ASSET_MANAGER", "ADMIN"),
  exportAllocations
);

router.get(
  "/exports/audit-logs",
  authorize("ADMIN"),
  exportAuditLogs
);

router.get(
  "/overdue",
  authorize("ASSET_MANAGER", "ADMIN"),
  getOverdueAllocations
);

router.post(
  "/overdue/process",
  authorize("ASSET_MANAGER", "ADMIN"),
  processOverdueAllocations
);

export default router;
