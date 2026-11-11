
import { Transaction } from "sequelize";
import sequelize from "../../../config/database.js";

import {
  Employee,
  Department,
  Asset,
  AssetTransfer,
  AssetAllocation,
  AssetVerification,
  Notification,
  SoftwareLicense,
  LicenseAssignment
} from "../models/index.js";

import { recordAudit } from "./auditService.js";

import {
  TRANSFER_STATUS,
  VERIFICATION_STATUS,
  LICENSE_ASSIGNMENT_STATUS,
  NOTIFICATION_TYPES
} from "../constants/employeeOperationsConstants.js";

const txOptions = {
  isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
};

const actorId = (req) => req.user.id;

const requestMetadata = (req) => ({
  requestId: req.requestId ?? null,
  ipAddress: req.ip ?? null,
  userAgent: req.get("user-agent") ?? null
});

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

async function notify({
  employeeId,
  title,
  message,
  type,
  transaction
}) {
  return Notification.create(
    {
      employeeId,
      title,
      message,
      type,
      isRead: false
    },
    { transaction }
  );
}
export async function requestTransfer(req, data) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const employee = await Employee.findByPk(actorId(req), { transaction });

    if (!employee || employee.employmentStatus !== "ACTIVE") {
      fail("Active employee not found", 403);
    }

    const asset = await Asset.findByPk(data.assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!asset) fail("Asset not found", 404);

    if (!asset.departmentId || asset.departmentId !== employee.departmentId) {
      fail("You can request transfer only for an asset in your department", 403);
    }

    if (!asset.isActive || ["RETIRED", "LOST"].includes(asset.status)) {
      fail("This asset cannot be transferred", 409);
    }

    const destination = await Department.findByPk(data.toDepartmentId, {
      transaction
    });

    if (!destination || !destination.isActive) {
      fail("Destination department is not active", 404);
    }

    if (destination.id === asset.departmentId) {
      fail("Asset already belongs to this department", 400);
    }

    const pending = await AssetTransfer.findOne({
      where: {
        assetId: asset.id,
        status: TRANSFER_STATUS.PENDING
      },
      transaction
    });

    if (pending) fail("A pending transfer already exists for this asset", 409);

    const transfer = await AssetTransfer.create(
      {
        assetId: asset.id,
        requestedBy: employee.id,
        fromDepartmentId: asset.departmentId,
        toDepartmentId: destination.id,
        requestReason: data.requestReason.trim(),
        status: TRANSFER_STATUS.PENDING
      },
      { transaction }
    );

    await notify({
      employeeId: employee.id,
      title: "Asset transfer request submitted",
      message: `Transfer request for ${asset.assetTag} to ${destination.name} was submitted.`,
      type: NOTIFICATION_TYPES.TRANSFER,
      transaction
    });

    await recordAudit({
      actorId: employee.id,
      action: "ASSET_TRANSFER_REQUESTED",
      entityType: "AssetTransfer",
      entityId: transfer.id,
      newValues: {
        assetId: asset.id,
        fromDepartmentId: asset.departmentId,
        toDepartmentId: destination.id,
        status: transfer.status
      },
      ...requestMetadata(req),
      transaction
    });

    await transaction.commit();
    return transfer;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function processTransfer(req, transferId, decision, rejectionReason) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const transfer = await AssetTransfer.findByPk(transferId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!transfer || transfer.status !== TRANSFER_STATUS.PENDING) {
      fail("Pending transfer request not found", 404);
    }

    const asset = await Asset.findByPk(transfer.assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!asset || asset.departmentId !== transfer.fromDepartmentId) {
      fail("Asset department has changed; transfer cannot be processed", 409);
    }

    if (decision === "REJECT") {
      transfer.status = TRANSFER_STATUS.REJECTED;
      transfer.approvedBy = actorId(req);
      transfer.approvedAt = new Date();
      transfer.rejectionReason = rejectionReason?.trim() || null;

      await transfer.save({ transaction });

      await notify({
        employeeId: transfer.requestedBy,
        title: "Asset transfer rejected",
        message: `Transfer request for ${asset.assetTag} was rejected.`,
        type: NOTIFICATION_TYPES.TRANSFER,
        transaction
      });
    } else if (decision === "APPROVE") {
      transfer.status = TRANSFER_STATUS.APPROVED;
      transfer.approvedBy = actorId(req);
      transfer.approvedAt = new Date();

      asset.departmentId = transfer.toDepartmentId;
      await asset.save({ transaction });

      transfer.status = TRANSFER_STATUS.COMPLETED;
      transfer.completedAt = new Date();

      await transfer.save({ transaction });

      await notify({
        employeeId: transfer.requestedBy,
        title: "Asset transfer completed",
        message: `Asset ${asset.assetTag} has been transferred to the requested department.`,
        type: NOTIFICATION_TYPES.TRANSFER,
        transaction
      });
    } else {
      fail("Decision must be APPROVE or REJECT");
    }

    await recordAudit({
      actorId: actorId(req),
      action: `ASSET_TRANSFER_${decision}`,
      entityType: "AssetTransfer",
      entityId: transfer.id,
      previousValues: {
        departmentId: transfer.fromDepartmentId,
        status: TRANSFER_STATUS.PENDING
      },
      newValues: {
        departmentId: asset.departmentId,
        status: transfer.status
      },
      ...requestMetadata(req),
      transaction
    });

    await transaction.commit();
    return transfer;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
export async function submitVerification(req, data) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const asset = await Asset.findByPk(data.assetId, { transaction });

    if (!asset) fail("Asset not found", 404);

    const existingAllocation = await AssetAllocation.findOne({
      where: {
        assetId: asset.id,
        employeeId: actorId(req),
        status: "ACTIVE"
      },
      transaction
    });

    if (!existingAllocation) {
      fail("You do not have an active allocation for this asset", 403);
    }

    const existing = await AssetVerification.findOne({
      where: {
        assetId: asset.id,
        employeeId: actorId(req),
        verificationPeriod: data.verificationPeriod
      },
      transaction
    });

    if (existing) {
      fail("Verification already submitted for this period", 409);
    }

    const verification = await AssetVerification.create(
      {
        assetId: asset.id,
        employeeId: actorId(req),
        verificationPeriod: data.verificationPeriod.trim(),
        reportedCondition: data.reportedCondition,
        employeeRemarks: data.employeeRemarks?.trim() || null,
        status:
          data.reportedCondition === "MISSING"
            ? VERIFICATION_STATUS.MISSING
            : VERIFICATION_STATUS.PENDING
      },
      { transaction }
    );

    await recordAudit({
      actorId: actorId(req),
      action: "ASSET_VERIFICATION_SUBMITTED",
      entityType: "AssetVerification",
      entityId: verification.id,
      newValues: {
        assetId: asset.id,
        verificationPeriod: verification.verificationPeriod,
        reportedCondition: verification.reportedCondition,
        status: verification.status
      },
      ...requestMetadata(req),
      transaction
    });

    await transaction.commit();
    return verification;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function processVerification(
  req,
  verificationId,
  decision,
  inspectionRemarks
) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const verification = await AssetVerification.findByPk(verificationId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!verification || verification.status !== VERIFICATION_STATUS.PENDING) {
      fail("Pending verification not found", 404);
    }

    if (!["CONFIRMED", "DISCREPANCY"].includes(decision)) {
      fail("Decision must be CONFIRMED or DISCREPANCY");
    }

    const previousStatus = verification.status;

    verification.status = decision;
    verification.verifiedBy = actorId(req);
    verification.verifiedAt = new Date();

    if (decision === "DISCREPANCY" && inspectionRemarks?.trim()) {
      verification.employeeRemarks = [
        verification.employeeRemarks,
        `Manager remarks: ${inspectionRemarks.trim()}`
      ].filter(Boolean).join("\n");
    }

    await verification.save({ transaction });

    if (decision === "DISCREPANCY") {
      await notify({
        employeeId: verification.employeeId,
        title: "Asset verification discrepancy",
        message: "Your asset verification requires attention.",
        type: NOTIFICATION_TYPES.ASSET,
        transaction
      });
    }

    await recordAudit({
      actorId: actorId(req),
      action: `ASSET_VERIFICATION_${decision}`,
      entityType: "AssetVerification",
      entityId: verification.id,
      previousValues: { status: previousStatus },
      newValues: {
        status: verification.status,
        verifiedBy: verification.verifiedBy
      },
      ...requestMetadata(req),
      transaction
    });

    await transaction.commit();
    return verification;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
export async function assignSoftwareLicense(req, data) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const [license, employee] = await Promise.all([
      SoftwareLicense.findByPk(data.licenseId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      }),
      Employee.findByPk(data.employeeId, { transaction })
    ]);

    if (!license) fail("Software license not found", 404);

    if (!employee || employee.employmentStatus !== "ACTIVE") {
      fail("Active employee not found", 404);
    }

    if (license.status !== "ACTIVE") {
      fail("Software license is not active", 409);
    }

    if (license.expiryDate && license.expiryDate < new Date().toISOString().slice(0, 10)) {
      fail("Software license has expired", 409);
    }

    if (license.availableSeats < 1) {
      fail("No available seats for this software license", 409);
    }

    const existing = await LicenseAssignment.findOne({
      where: {
        licenseId: license.id,
        employeeId: employee.id,
        status: LICENSE_ASSIGNMENT_STATUS.ACTIVE
      },
      transaction
    });

    if (existing) fail("Employee already has this license", 409);

    const assignment = await LicenseAssignment.create(
      {
        licenseId: license.id,
        employeeId: employee.id,
        assignedBy: actorId(req),
        status: LICENSE_ASSIGNMENT_STATUS.ACTIVE
      },
      { transaction }
    );

    license.availableSeats -= 1;
    await license.save({ transaction });

    await notify({
      employeeId: employee.id,
      title: "Software license assigned",
      message: `${license.softwareName} has been assigned to your account.`,
      type: NOTIFICATION_TYPES.LICENSE,
      transaction
    });

    await recordAudit({
      actorId: actorId(req),
      action: "SOFTWARE_LICENSE_ASSIGNED",
      entityType: "LicenseAssignment",
      entityId: assignment.id,
      newValues: {
        licenseId: license.id,
        employeeId: employee.id,
        status: assignment.status,
        availableSeats: license.availableSeats
      },
      ...requestMetadata(req),
      transaction
    });

    await transaction.commit();
    return assignment;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function revokeSoftwareLicense(req, assignmentId) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const assignment = await LicenseAssignment.findByPk(assignmentId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!assignment || assignment.status !== LICENSE_ASSIGNMENT_STATUS.ACTIVE) {
      fail("Active license assignment not found", 404);
    }

    const license = await SoftwareLicense.findByPk(assignment.licenseId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!license) fail("Software license not found", 404);

    assignment.status = LICENSE_ASSIGNMENT_STATUS.REVOKED;
    assignment.revokedAt = new Date();
    await assignment.save({ transaction });

    license.availableSeats = Math.min(
      license.totalSeats,
      license.availableSeats + 1
    );
    await license.save({ transaction });

    await notify({
      employeeId: assignment.employeeId,
      title: "Software license revoked",
      message: `${license.softwareName} access has been revoked.`,
      type: NOTIFICATION_TYPES.LICENSE,
      transaction
    });

    await recordAudit({
      actorId: actorId(req),
      action: "SOFTWARE_LICENSE_REVOKED",
      entityType: "LicenseAssignment",
      entityId: assignment.id,
      previousValues: { status: LICENSE_ASSIGNMENT_STATUS.ACTIVE },
      newValues: {
        status: assignment.status,
        availableSeats: license.availableSeats
      },
      ...requestMetadata(req),
      transaction
    });

    await transaction.commit();
    return assignment;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getMyLicenses(req) {
  return LicenseAssignment.findAll({
    where: {
      employeeId: actorId(req),
      status: LICENSE_ASSIGNMENT_STATUS.ACTIVE
    },
    include: [{
      model: SoftwareLicense,
      as: "license",
      attributes: [
        "id",
        "softwareName",
        "vendorName",
        "licenseType",
        "expiryDate",
        "status"
      ]
    }],
    order: [["assignedAt", "DESC"]]
  });
}
export async function getMyNotifications(req, { page = 1, limit = 20 }) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  return Notification.findAndCountAll({
    where: { employeeId: actorId(req) },
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    order: [["createdAt", "DESC"]]
  });
}

export async function markNotificationRead(req, notificationId) {
  const notification = await Notification.findOne({
    where: {
      id: notificationId,
      employeeId: actorId(req)
    }
  });

  if (!notification) fail("Notification not found", 404);

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
}
