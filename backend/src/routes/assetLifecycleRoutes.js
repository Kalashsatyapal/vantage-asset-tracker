import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateAllocation,
  validateReturnRequest,
  validateMaintenanceTicket
} from "../validators/assetLifecycleValidator.js";
import {
  updateMaintenance,
  getMaintenanceTickets
} from "../controllers/assetLifecycleController.js";
import {
  getAvailableAssets,
  getAsset,
  allocateAsset,
  requestReturn,
  inspectReturn,
  reportDamage,
  getMyAssetHistory,
  getMyAssetSummary
} from "../controllers/assetLifecycleController.js";

const router = Router();

router.use(authenticate);

// Employee and asset managers can browse available assets.
router.get(
  "/available",
  authorize("EMPLOYEE", "ASSET_MANAGER", "ADMIN"),
  getAvailableAssets
);

router.get(
  "/my/history",
  authorize("EMPLOYEE", "ASSET_MANAGER", "ADMIN"),
  getMyAssetHistory
);

router.get(
  "/my/summary",
  authorize("EMPLOYEE", "ASSET_MANAGER", "ADMIN"),
  getMyAssetSummary
);
router.get(
  "/maintenance/tickets",
  authorize("ASSET_MANAGER", "ADMIN"),
  getMaintenanceTickets
);

router.patch(
  "/maintenance/tickets/:ticketId",
  authorize("ASSET_MANAGER", "ADMIN"),
  updateMaintenance
);
router.get(
  "/:id",
  authorize("EMPLOYEE", "ASSET_MANAGER", "ADMIN"),
  getAsset
);

// Allocation and inspection are manager/admin operations.
router.post(
  "/allocations",
  authorize("ASSET_MANAGER", "ADMIN"),
  validateAllocation,
  allocateAsset
);

router.post(
  "/allocations/:allocationId/return",
  authorize("EMPLOYEE"),
  validateReturnRequest,
  requestReturn
);

router.patch(
  "/returns/:returnId/inspect",
  authorize("ASSET_MANAGER", "ADMIN"),
  inspectReturn
);

router.post(
  "/:assetId/damage-reports",
  authorize("EMPLOYEE", "ASSET_MANAGER", "ADMIN"),
  validateMaintenanceTicket,
  reportDamage
);

export default router;