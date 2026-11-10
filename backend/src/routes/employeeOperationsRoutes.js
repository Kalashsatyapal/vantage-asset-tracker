import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateTransferRequest,
  validateVerification,
  validateLicenseRequest
} from "../validators/employeeOperationsValidator.js";

import {
  createTransfer,
  decideTransfer,
  createVerification,
  decideVerification,
  createLicenseRequest,
  decideLicenseRequest,
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

router.post(
  "/licenses/requests",
  authorize("EMPLOYEE"),
  validateLicenseRequest,
  createLicenseRequest
);

router.patch(
  "/licenses/requests/:assignmentId/decision",
  authorize("ASSET_MANAGER", "ADMIN"),
  decideLicenseRequest
);

router.get(
  "/notifications",
  getNotifications
);

router.patch(
  "/notifications/:notificationId/read",
  readNotification
);

export default router;