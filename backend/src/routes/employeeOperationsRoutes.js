
import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateTransferRequest,
  validateVerification,
  validateLicenseAssignment
} from "../validators/employeeOperationsValidator.js";

import {
  createTransfer,
  decideTransfer,
  createVerification,
  decideVerification,
  assignLicense,
  revokeLicense,
  getMyLicenses,
  getNotifications,
  readNotification
} from "../controllers/employeeOperationsController.js";
const router = Router();
router.use(authenticate);
router.post(
  "/transfers",
  authorize("EMPLOYEE"),
  validateTransferRequest,
  createTransfer
);

router.patch(
  "/transfers/:transferId/decision",
  authorize("ASSET_MANAGER", "ADMIN"),
  decideTransfer
);
router.post(
  "/verifications",
  authorize("EMPLOYEE"),
  validateVerification,
  createVerification
);

router.patch(
  "/verifications/:verificationId/decision",
  authorize("ASSET_MANAGER", "ADMIN"),
  decideVerification
);
router.get(
  "/licenses/my",
  authorize("EMPLOYEE", "ASSET_MANAGER", "ADMIN"),
  getMyLicenses
);

router.post(
  "/licenses/assignments",
  authorize("ASSET_MANAGER", "ADMIN"),
  validateLicenseAssignment,
  assignLicense
);

router.patch(
  "/licenses/assignments/:assignmentId/revoke",
  authorize("ASSET_MANAGER", "ADMIN"),
  revokeLicense
);
router.get("/notifications", getNotifications);

router.patch(
  "/notifications/:notificationId/read",
  readNotification
);

export default router;
