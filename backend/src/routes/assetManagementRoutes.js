
import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateAssetCreate,
  validateAssetUpdate,
  validateMaintenanceSchedule,
  validateMasterDataCreate,
  validateMasterDataUpdate
} from "../validators/assetManagementValidator.js";

import {
  listAssets,
  createAsset,
  updateAsset,
  retireAsset,
  listMasterData,
  createMasterData,
  updateMasterData,
  deactivateMasterData,
  createMaintenanceSchedule,
  listMaintenanceSchedules,
  updateMaintenanceSchedule,
  getDashboard
} from "../controllers/assetManagementController.js";

const router = Router();

router.use(authenticate);
router.use(authorize("ASSET_MANAGER", "ADMIN"));

router.get("/dashboard", getDashboard);

router.get("/assets", listAssets);
router.post("/assets", validateAssetCreate, createAsset);
router.patch("/assets/:assetId", validateAssetUpdate, updateAsset);
router.patch("/assets/:assetId/retire", retireAsset);

router.get("/master/:type", authorize("ADMIN"), listMasterData);
router.post("/master/:type", authorize("ADMIN"), createMasterData);
router.patch("/master/:type/:id", authorize("ADMIN"), updateMasterData);
router.patch(
  "/master/:type/:id/deactivate",
  authorize("ADMIN"),
  deactivateMasterData
);

router.get("/maintenance-schedules", listMaintenanceSchedules);
router.post(
  "/maintenance-schedules",
  validateMaintenanceSchedule,
  createMaintenanceSchedule
);
router.patch(
  "/maintenance-schedules/:scheduleId",
  updateMaintenanceSchedule
);
router.post(
  "/master/:type",
  authorize("ADMIN"),
  validateMasterDataCreate,
  createMasterData
);

router.patch(
  "/master/:type/:id",
  authorize("ADMIN"),
  validateMasterDataUpdate,
  updateMasterData
);
export default router;
