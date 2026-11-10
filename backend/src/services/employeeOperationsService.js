import { Transaction } from "sequelize";
import sequelize from "../../../config/database.js";

import {
  Employee,
  Asset,
  AssetAllocation,
  AssetTransfer,
  AssetVerification,
  Notification,
  SoftwareLicense,
  LicenseAssignment
} from "../models/index.js";

import { recordAudit } from "./auditService.js";

import {
  ALLOCATION_STATUS,
  ASSET_STATUS,
  ASSET_CONDITION
} from "../constants/assetLifecycleConstants.js";

import {
  TRANSFER_STATUS,
  VERIFICATION_STATUS,
  LICENSE_ASSIGNMENT_STATUS,
  NOTIFICATION_STATUS
} from "../constants/employeeOperationsConstants.js";

const txOptions = {
  isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
};

function actorId(req) {
  return req.user.id;
}

function metadata(req) {
  return {
    requestId: req.requestId ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null
  };
}

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

async function notify({
  employeeId,
  title,
  message,
  type = "GENERAL",
  transaction
}) {
  return Notification.create({
    employeeId,
    title,
    message,
    type,
    status: NOTIFICATION_STATUS.UNREAD
  }, { transaction });
}

/* ---------------- ASSET TRANSFER ---------------- */

export async function requestTransfer(req, data) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const asset = await Asset.findByPk(data.assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!asset) fail("Asset not found", 404);

    const allocation = await AssetAllocation.findOne({
      where: {
        assetId: asset.id,
        employeeId: actorId(req),
        status: ALLOCATION_STATUS.ACTIVE
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!allocation) {
      fail("You do not have an active allocation for this asset", 403);
    }

    const targetEmployee = await Employee.findByPk(
      data.targetEmployeeId,
      { transaction }
    );

    if (!targetEmployee || targetEmployee.status !== "ACTIVE") {
      fail("Target employee is not active", 404);
    }

    const pending = await AssetTransfer.findOne({
      where: {
        assetId: asset.id,
        status: TRANSFER_STATUS.PENDING
      },
      transaction
    });

    if (pending) {
      fail("A transfer request is already pending", 409);
    }

    const transfer = await AssetTransfer.create({
      assetId: asset.id,
      fromEmployeeId: actorId(req),
      toEmployeeId: targetEmployee.id,
      requestedBy: actorId(req),
      reason: data.reason.trim(),
      status: TRANSFER_STATUS.PENDING,
      requestedAt: new Date()
    }, { transaction });

    await notify({
      employeeId: targetEmployee.id,
      title: "Asset transfer requested",
      message: `An asset transfer request has been submitted for asset ${asset.assetTag}.`,
      type: "ASSET_TRANSFER",
      transaction
    });

    await recordAudit({
      actorId: actorId(req),
      action: "ASSET_TRANSFER_REQUESTED",
      entityType: "AssetTransfer",
      entityId: transfer.id,
      previousValues: null,
      newValues: {
        assetId: asset.id,
        fromEmployeeId: actorId(req),
        toEmployeeId: targetEmployee.id,
        status: transfer.status
      },
      ...metadata(req),
      transaction
    });

    await transaction.commit();
    return transfer;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function processTransfer(req, transferId, decision) {
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

    if (!asset || asset.status !== ASSET_STATUS.ALLOCATED) {
      fail("Asset is not in an allocatable state", 409);
    }

    const sourceAllocation = await AssetAllocation.findOne({
      where: {
        assetId: transfer.assetId,
        employeeId: transfer.fromEmployeeId,
        status: ALLOCATION_STATUS.ACTIVE
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!sourceAllocation) {
      fail("Source employee allocation is no longer active", 409);
    }

    if (decision === "REJECT") {
      transfer.status = TRANSFER_STATUS.REJECTED;
      transfer.processedBy = actorId(req);
      transfer.processedAt = new Date();

      await transfer.save({ transaction });

      await notify({
        employeeId: transfer.fromEmployeeId,
        title: "Asset transfer rejected",
        message: `Your transfer request for asset ${asset.assetTag} was rejected.`,
        type: "ASSET_TRANSFER",
        transaction
      });

      await transaction.commit();
      return transfer;
    }

    if (decision !== "APPROVE") {
      fail("Decision must be APPROVE or REJECT");
    }

    const targetEmployee = await Employee.findByPk(
      transfer.toEmployeeId,
      { transaction, lock: transaction.LOCK.UPDATE }
    );

    if (!targetEmployee || targetEmployee.status !== "ACTIVE") {
      fail("Target employee is no longer active", 409);
    }

    const existingTargetAllocation = await AssetAllocation.findOne({
      where: {
        assetId: transfer.assetId,
        employeeId: transfer.toEmployeeId,
        status: [
          ALLOCATION_STATUS.ACTIVE,
          ALLOCATION_STATUS.RETURN_REQUESTED
        ]
      },
      transaction
    });

    if (existingTargetAllocation) {
      fail("Target employee already has an active allocation for this asset", 409);
    }

    sourceAllocation.status = ALLOCATION_STATUS.RETURNED;
    await sourceAllocation.save({ transaction });

    const newAllocation = await AssetAllocation.create({
      assetId: transfer.assetId,
      employeeId: transfer.toEmployeeId,
      allocatedBy: actorId(req),
      allocatedAt: new Date(),
      status: ALLOCATION_STATUS.ACTIVE
    }, { transaction });

    transfer.status = TRANSFER_STATUS.COMPLETED;
    transfer.processedBy = actorId(req);
    transfer.processedAt = new Date();

    await transfer.save({ transaction });

    await notify({
      employeeId: transfer.fromEmployeeId,
      title: "Asset transfer completed",
      message: `Asset ${asset.assetTag} has been transferred to another employee.`,
      type: "ASSET_TRANSFER",
      transaction
    });

    await notify({
      employeeId: transfer.toEmployeeId,
      title: "Asset assigned to you",
      message: `Asset ${asset.assetTag} has been assigned to you.`,
      type: "ASSET_TRANSFER",
      transaction
    });

    await recordAudit({
      actorId: actorId(req),
      action: "ASSET_TRANSFER_COMPLETED",
      entityType: "AssetTransfer",
      entityId: transfer.id,
      previousValues: {
        employeeId: transfer.fromEmployeeId
      },
      newValues: {
        employeeId: transfer.toEmployeeId,
        allocationId: newAllocation.id,
        status: transfer.status
      },
      ...metadata(req),
      transaction
    });

    await transaction.commit();
    return transfer;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/* ---------------- ASSET VERIFICATION ---------------- */

export async function submitVerification(req, data) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const allocation = await AssetAllocation.findOne({
      where: {
        assetId: data.assetId,
        employeeId: actorId(req),
        status: [
          ALLOCATION_STATUS.ACTIVE,
          ALLOCATION_STATUS.RETURN_REQUESTED
        ]
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!allocation) {
      fail("No active allocation found for this asset", 404);
    }

    const existing = await AssetVerification.findOne({
      where: {
        assetId: data.assetId,
        employeeId: actorId(req),
        status: VERIFICATION_STATUS.PENDING
      },
      transaction
    });

    if (existing) {
      fail("A verification is already pending", 409);
    }

    const verification = await AssetVerification.create({
      assetId: data.assetId,
      employeeId: actorId(req),
      condition: data.condition,
      notes: data.notes?.trim() || null,
      status: VERIFICATION_STATUS.PENDING,
      submittedAt: new Date()
    }, { transaction });

    await recordAudit({
      actorId: actorId(req),
      action: "ASSET_VERIFICATION_SUBMITTED",
      entityType: "AssetVerification",
      entityId: verification.id,
      previousValues: null,
      newValues: {
        assetId: data.assetId,
        condition: data.condition,
        status: verification.status
      },
      ...metadata(req),
      transaction
    });

    await transaction.commit();
    return verification;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function processVerification(req, verificationId, decision, notes) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const verification = await AssetVerification.findByPk(verificationId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!verification || verification.status !== VERIFICATION_STATUS.PENDING) {
      fail("Pending verification not found", 404);
    }

    if (!["VERIFY", "FLAG"].includes(decision)) {
      fail("Decision must be VERIFY or FLAG");
    }

    verification.status =
      decision === "VERIFY"
        ? VERIFICATION_STATUS.VERIFIED
        : VERIFICATION_STATUS.FLAGGED;

    verification.verifiedBy = actorId(req);
    verification.verifiedAt = new Date();

    if (notes !== undefined) {
      verification.notes = notes.trim();
    }

    await verification.save({ transaction });

    if (decision === "FLAG") {
      await notify({
        employeeId: verification.employeeId,
        title: "Asset verification flagged",
        message: "Your asset verification requires further attention.",
        type: "ASSET_VERIFICATION",
        transaction
      });
    }

    await recordAudit({
      actorId: actorId(req),
      action: `ASSET_VERIFICATION_${decision}`,
      entityType: "AssetVerification",
      entityId: verification.id,
      previousValues: { status: VERIFICATION_STATUS.PENDING },
      newValues: { status: verification.status },
      ...metadata(req),
      transaction
    });

    await transaction.commit();
    return verification;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/* ---------------- SOFTWARE LICENSES ---------------- */

export async function requestSoftwareLicense(req, data) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const license = await SoftwareLicense.findByPk(
      data.softwareLicenseId,
      { transaction, lock: transaction.LOCK.UPDATE }
    );

    if (!license) fail("Software license not found", 404);

    const existing = await LicenseAssignment.findOne({
      where: {
        softwareLicenseId: license.id,
        employeeId: actorId(req),
        status: LICENSE_ASSIGNMENT_STATUS.ACTIVE
      },
      transaction
    });

    if (existing) {
      fail("You already have this software license assigned", 409);
    }

    const assignment = await LicenseAssignment.create({
      softwareLicenseId: license.id,
      employeeId: actorId(req),
      requestedBy: actorId(req),
      reason: data.reason.trim(),
      status: "PENDING",
      requestedAt: new Date()
    }, { transaction });

    await notify({
      employeeId: actorId(req),
      title: "Software license request submitted",
      message: `Your request for ${license.name} has been submitted.`,
      type: "LICENSE",
      transaction
    });

    await recordAudit({
      actorId: actorId(req),
      action: "SOFTWARE_LICENSE_REQUESTED",
      entityType: "LicenseAssignment",
      entityId: assignment.id,
      previousValues: null,
      newValues: {
        softwareLicenseId: license.id,
        status: assignment.status
      },
      ...metadata(req),
      transaction
    });

    await transaction.commit();
    return assignment;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function processLicenseRequest(req, assignmentId, decision) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const assignment = await LicenseAssignment.findByPk(assignmentId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!assignment || assignment.status !== "PENDING") {
      fail("Pending license request not found", 404);
    }

    const license = await SoftwareLicense.findByPk(
      assignment.softwareLicenseId,
      { transaction, lock: transaction.LOCK.UPDATE }
    );

    if (!license) fail("Software license not found", 404);

    if (decision === "APPROVE") {
      const activeCount = await LicenseAssignment.count({
        where: {
          softwareLicenseId: license.id,
          status: LICENSE_ASSIGNMENT_STATUS.ACTIVE
        },
        transaction
      });

      if (activeCount >= license.totalSeats) {
        fail("No available seats for this software license", 409);
      }

      assignment.status = LICENSE_ASSIGNMENT_STATUS.ACTIVE;
      assignment.approvedBy = actorId(req);
      assignment.approvedAt = new Date();
    } else if (decision === "REJECT") {
      assignment.status = "REJECTED";
      assignment.approvedBy = actorId(req);
      assignment.approvedAt = new Date();
    } else {
      fail("Decision must be APPROVE or REJECT");
    }

    await assignment.save({ transaction });

    await notify({
      employeeId: assignment.employeeId,
      title: `Software license request ${decision.toLowerCase()}d`,
      message: `Your software license request has been ${decision.toLowerCase()}d.`,
      type: "LICENSE",
      transaction
    });

    await recordAudit({
      actorId: actorId(req),
      action: `SOFTWARE_LICENSE_${decision}`,
      entityType: "LicenseAssignment",
      entityId: assignment.id,
      previousValues: { status: "PENDING" },
      newValues: { status: assignment.status },
      ...metadata(req),
      transaction
    });

    await transaction.commit();
    return assignment;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/* ---------------- NOTIFICATIONS ---------------- */

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

  notification.status = NOTIFICATION_STATUS.READ;
  notification.readAt = new Date();

  await notification.save();

  return notification;
}