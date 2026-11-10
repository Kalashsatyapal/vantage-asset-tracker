import {
  Transaction,
  OptimisticLockError
} from "sequelize";

import sequelize from "../../../config/database.js";

import {
  Employee,
  Asset,
  AssetAllocation,
  AssetReturn,
  MaintenanceTicket
} from "../models/index.js";

import { recordAudit } from "./auditService.js";

import {
  ASSET_STATUS,
  ALLOCATION_STATUS,
  RETURN_STATUS,
  ASSET_CONDITION,
  MAINTENANCE_PRIORITY,
  MAINTENANCE_STATUS
} from "../constants/assetLifecycleConstants.js";

const transactionOptions = {
  isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
};

function getActorId(user) {
  return user.id;
}

function getRequestMetadata(req) {
  return {
    requestId: req.requestId ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null
  };
}

function assertAssetAvailable(asset) {
  if (!asset || asset.status !== ASSET_STATUS.AVAILABLE) {
    const error = new Error("Asset is not available for allocation");
    error.statusCode = 409;
    throw error;
  }
}

function getPriority(condition, requestedPriority) {
  if (condition === ASSET_CONDITION.CRITICAL) {
    return MAINTENANCE_PRIORITY.CRITICAL;
  }

  if (condition === ASSET_CONDITION.DAMAGED) {
    return requestedPriority === MAINTENANCE_PRIORITY.CRITICAL
      ? MAINTENANCE_PRIORITY.CRITICAL
      : MAINTENANCE_PRIORITY.HIGH;
  }

  return requestedPriority || MAINTENANCE_PRIORITY.MEDIUM;
}

export async function listAvailableAssets({ page = 1, limit = 20 }) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  return Asset.findAndCountAll({
    where: {
      status: ASSET_STATUS.AVAILABLE
    },
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    order: [["createdAt", "DESC"]]
  });
}

export async function getAssetDetails(assetId) {
  const asset = await Asset.findByPk(assetId);

  if (!asset) {
    const error = new Error("Asset not found");
    error.statusCode = 404;
    throw error;
  }

  return asset;
}

export async function allocateAsset({ req, employeeId, assetId }) {
  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const employee = await Employee.findByPk(employeeId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!employee || employee.status !== "ACTIVE") {
      const error = new Error("Active employee not found");
      error.statusCode = 404;
      throw error;
    }

    const asset = await Asset.findByPk(assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    assertAssetAvailable(asset);

    const allocation = await AssetAllocation.create({
      assetId: asset.id,
      employeeId: employee.id,
      allocatedBy: getActorId(req.user),
      allocatedAt: new Date(),
      status: ALLOCATION_STATUS.ACTIVE
    }, { transaction });

    const previousStatus = asset.status;

    asset.status = ASSET_STATUS.ALLOCATED;
    await asset.save({ transaction });

    await recordAudit({
      actorId: getActorId(req.user),
      action: "ASSET_ALLOCATED",
      entityType: "Asset",
      entityId: asset.id,
      previousValues: { status: previousStatus },
      newValues: { status: asset.status, employeeId },
      ...getRequestMetadata(req),
      transaction
    });

    await transaction.commit();

    return allocation;
  } catch (error) {
    await transaction.rollback();

    if (error instanceof OptimisticLockError) {
      error.statusCode = 409;
      error.message = "Asset was modified by another operation. Retry.";
    }

    throw error;
  }
}

export async function requestAssetReturn({ req, allocationId, condition, notes }) {
  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const allocation = await AssetAllocation.findByPk(allocationId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!allocation || allocation.employeeId !== getActorId(req.user)) {
      const error = new Error("Allocation not found");
      error.statusCode = 404;
      throw error;
    }

    if (allocation.status !== ALLOCATION_STATUS.ACTIVE) {
      const error = new Error("This allocation cannot be returned");
      error.statusCode = 409;
      throw error;
    }

    const existingRequest = await AssetReturn.findOne({
      where: {
        allocationId,
        status: RETURN_STATUS.PENDING
      },
      transaction
    });

    if (existingRequest) {
      const error = new Error("A return request is already pending");
      error.statusCode = 409;
      throw error;
    }

    const assetReturn = await AssetReturn.create({
      allocationId,
      assetId: allocation.assetId,
      employeeId: allocation.employeeId,
      requestedAt: new Date(),
      condition,
      notes: notes?.trim() || null,
      status: RETURN_STATUS.PENDING
    }, { transaction });

    allocation.status = ALLOCATION_STATUS.RETURN_REQUESTED;
    await allocation.save({ transaction });

    await recordAudit({
      actorId: getActorId(req.user),
      action: "ASSET_RETURN_REQUESTED",
      entityType: "AssetReturn",
      entityId: assetReturn.id,
      previousValues: { allocationStatus: ALLOCATION_STATUS.ACTIVE },
      newValues: { status: RETURN_STATUS.PENDING, condition },
      ...getRequestMetadata(req),
      transaction
    });

    await transaction.commit();

    return assetReturn;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function inspectAssetReturn({
  req,
  returnId,
  decision,
  condition,
  notes
}) {
  if (
    condition !== undefined &&
    !Object.values(ASSET_CONDITION).includes(condition)
  ) {
    const error = new Error("Invalid inspection condition");
    error.statusCode = 400;
    throw error;
  }

  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const assetReturn = await AssetReturn.findByPk(returnId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!assetReturn || assetReturn.status !== RETURN_STATUS.PENDING) {
      const error = new Error("Pending return request not found");
      error.statusCode = 404;
      throw error;
    }

    const allocation = await AssetAllocation.findByPk(
      assetReturn.allocationId,
      { transaction, lock: transaction.LOCK.UPDATE }
    );

    const asset = await Asset.findByPk(assetReturn.assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!allocation || !asset) {
      const error = new Error("Related allocation or asset not found");
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = asset.status;

    if (decision === "APPROVE") {
      const finalCondition = condition || assetReturn.condition;

      assetReturn.status = RETURN_STATUS.APPROVED;
      assetReturn.condition = finalCondition;
      assetReturn.inspectedBy = getActorId(req.user);
      assetReturn.inspectedAt = new Date();

      allocation.status = ALLOCATION_STATUS.RETURNED;

      asset.status =
        finalCondition === ASSET_CONDITION.GOOD
          ? ASSET_STATUS.AVAILABLE
          : ASSET_STATUS.MAINTENANCE;

      await asset.save({ transaction });
      await allocation.save({ transaction });
      await assetReturn.save({ transaction });

      if (asset.status === ASSET_STATUS.MAINTENANCE) {
        await MaintenanceTicket.create({
          assetId: asset.id,
          reportedBy: getActorId(req.user),
          title: "Maintenance required after asset return",
          description: notes?.trim() ||
            "Asset requires inspection following return",
          priority: getPriority(finalCondition),
          status: MAINTENANCE_STATUS.OPEN
        }, { transaction });
      }
    } else if (decision === "REJECT") {
      assetReturn.status = RETURN_STATUS.REJECTED;
      assetReturn.inspectedBy = getActorId(req.user);
      assetReturn.inspectedAt = new Date();

      allocation.status = ALLOCATION_STATUS.ACTIVE;

      await assetReturn.save({ transaction });
      await allocation.save({ transaction });
    } else {
      const error = new Error("Decision must be APPROVE or REJECT");
      error.statusCode = 400;
      throw error;
    }

    await recordAudit({
      actorId: getActorId(req.user),
      action: decision === "APPROVE"
        ? "ASSET_RETURN_APPROVED"
        : "ASSET_RETURN_REJECTED",
      entityType: "AssetReturn",
      entityId: assetReturn.id,
      previousValues: { assetStatus: previousStatus },
      newValues: {
        returnStatus: assetReturn.status,
        assetStatus: asset.status,
        condition: assetReturn.condition
      },
      ...getRequestMetadata(req),
      transaction
    });

    await transaction.commit();

    return assetReturn;
  } catch (error) {
    await transaction.rollback();

    if (error instanceof OptimisticLockError) {
      error.statusCode = 409;
      error.message = "Asset changed during inspection. Retry.";
    }

    throw error;
  }
}

export async function reportAssetDamage({
  req,
  assetId,
  title,
  description,
  priority
}) {
  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const asset = await Asset.findByPk(assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!asset) {
      const error = new Error("Asset not found");
      error.statusCode = 404;
      throw error;
    }

    const ticket = await MaintenanceTicket.create({
      assetId,
      reportedBy: getActorId(req.user),
      title: title.trim(),
      description: description.trim(),
      priority: getPriority(
        ASSET_CONDITION.DAMAGED,
        priority
      ),
      status: MAINTENANCE_STATUS.OPEN
    }, { transaction });

    const previousStatus = asset.status;

    if (asset.status !== ASSET_STATUS.RETIRED) {
      asset.status = ASSET_STATUS.MAINTENANCE;
      await asset.save({ transaction });
    }
    if (req.user.role === "EMPLOYEE") {
      const activeAllocation = await AssetAllocation.findOne({
        where: {
          assetId,
          employeeId: getActorId(req.user),
          status: ALLOCATION_STATUS.ACTIVE
        },
        transaction
      });

      if (!activeAllocation) {
        const error = new Error(
          "You can report damage only for an asset allocated to you"
        );
        error.statusCode = 403;
        throw error;
      }
    }
    await recordAudit({
      actorId: getActorId(req.user),
      action: "ASSET_DAMAGE_REPORTED",
      entityType: "MaintenanceTicket",
      entityId: ticket.id,
      previousValues: { assetStatus: previousStatus },
      newValues: {
        assetStatus: asset.status,
        priority: ticket.priority
      },
      ...getRequestMetadata(req),
      transaction
    });

    await transaction.commit();

    return ticket;
  } catch (error) {
    await transaction.rollback();

    if (error instanceof OptimisticLockError) {
      error.statusCode = 409;
      error.message = "Asset changed during damage reporting. Retry.";
    }

    throw error;
  }
}

export async function getEmployeeAssetHistory(employeeId) {
  return AssetAllocation.findAll({
    where: { employeeId },
    include: [
      { model: Asset, as: "asset" }
    ],
    order: [["allocatedAt", "DESC"]]
  });
}

export async function getEmployeeAssetSummary(employeeId) {
  const [activeAllocations, pendingReturns, openTickets] =
    await Promise.all([
      AssetAllocation.count({
        where: {
          employeeId,
          status: [
            ALLOCATION_STATUS.ACTIVE,
            ALLOCATION_STATUS.RETURN_REQUESTED
          ]
        }
      }),
      AssetReturn.count({
        where: {
          employeeId,
          status: RETURN_STATUS.PENDING
        }
      }),
      MaintenanceTicket.count({
        where: {
          reportedBy: employeeId,
          status: [
            MAINTENANCE_STATUS.OPEN,
            MAINTENANCE_STATUS.ASSIGNED,
            MAINTENANCE_STATUS.IN_PROGRESS
          ]
        }
      })
    ]);

  return {
    activeAllocations,
    pendingReturns,
    openTickets
  };
}
export async function updateMaintenanceTicket({
  req,
  ticketId,
  assignedTo,
  status,
  priority
}) {
  const transaction = await sequelize.transaction(transactionOptions);
  if (
    priority !== undefined &&
    !Object.values(MAINTENANCE_PRIORITY).includes(priority)
  ) {
    const error = new Error("Invalid maintenance priority");
    error.statusCode = 400;
    throw error;
  }
  try {
    const ticket = await MaintenanceTicket.findByPk(ticketId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!ticket) {
      const error = new Error("Maintenance ticket not found");
      error.statusCode = 404;
      throw error;
    }

    const previousValues = {
      assignedTo: ticket.assignedTo,
      status: ticket.status,
      priority: ticket.priority
    };

    if (assignedTo !== undefined && assignedTo !== null) {
      const technician = await Employee.findByPk(assignedTo, {
        transaction
      });

      if (!technician || technician.status !== "ACTIVE") {
        const error = new Error("Active technician not found");
        error.statusCode = 404;
        throw error;
      }

      ticket.assignedTo = assignedTo;

      if (ticket.status === MAINTENANCE_STATUS.OPEN) {
        ticket.status = MAINTENANCE_STATUS.ASSIGNED;
      }
    }

    const allowedTransitions = {
      [MAINTENANCE_STATUS.OPEN]: [
        MAINTENANCE_STATUS.ASSIGNED,
        MAINTENANCE_STATUS.IN_PROGRESS
      ],
      [MAINTENANCE_STATUS.ASSIGNED]: [
        MAINTENANCE_STATUS.IN_PROGRESS
      ],
      [MAINTENANCE_STATUS.IN_PROGRESS]: [
        MAINTENANCE_STATUS.RESOLVED
      ],
      [MAINTENANCE_STATUS.RESOLVED]: [
        MAINTENANCE_STATUS.CLOSED,
        MAINTENANCE_STATUS.IN_PROGRESS
      ],
      [MAINTENANCE_STATUS.CLOSED]: []
    };

    if (status !== undefined) {
      const allowed = allowedTransitions[ticket.status] || [];

      if (!allowed.includes(status)) {
        const error = new Error(
          `Invalid maintenance transition: ${ticket.status} to ${status}`
        );
        error.statusCode = 409;
        throw error;
      }

      ticket.status = status;
    }

    if (priority !== undefined) {
      ticket.priority = priority;
    }

    await ticket.save({ transaction });

    await recordAudit({
      actorId: getActorId(req.user),
      action: "MAINTENANCE_TICKET_UPDATED",
      entityType: "MaintenanceTicket",
      entityId: ticket.id,
      previousValues,
      newValues: {
        assignedTo: ticket.assignedTo,
        status: ticket.status,
        priority: ticket.priority
      },
      ...getRequestMetadata(req),
      transaction
    });

    await transaction.commit();

    return ticket;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function listMaintenanceTickets({ page = 1, limit = 20 }) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  return MaintenanceTicket.findAndCountAll({
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    order: [["createdAt", "DESC"]]
  });
}