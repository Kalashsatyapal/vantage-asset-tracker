
import {
  Transaction,
  OptimisticLockError
} from "sequelize";
import { randomBytes } from "node:crypto";

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

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const actorId = (req) => req.user.id;

function requestMetadata(req) {
  return {
    requestId: req.requestId ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null
  };
}

function generateTicketNumber() {
  return `MT-${Date.now()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

function getPriority(condition, requestedPriority) {
  if (condition === ASSET_CONDITION.DAMAGED) {
    return requestedPriority === MAINTENANCE_PRIORITY.CRITICAL
      ? MAINTENANCE_PRIORITY.CRITICAL
      : MAINTENANCE_PRIORITY.HIGH;
  }

  return requestedPriority || MAINTENANCE_PRIORITY.MEDIUM;
}

function assertAssetAvailable(asset) {
  if (!asset || asset.status !== ASSET_STATUS.AVAILABLE) {
    fail("Asset is not available for allocation", 409);
  }
}

async function createMaintenanceTicket({
  assetId,
  employeeId,
  title,
  description,
  issueType = "OTHER",
  priority = MAINTENANCE_PRIORITY.MEDIUM,
  transaction
}) {
  return MaintenanceTicket.create({
    ticketNumber: generateTicketNumber(),
    assetId,
    employeeId,
    title,
    description,
    issueType,
    priority,
    status: MAINTENANCE_STATUS.OPEN
  }, { transaction });
}

export async function listAvailableAssets({
  page = 1,
  limit = 20
} = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  return Asset.findAndCountAll({
    where: {
      status: ASSET_STATUS.AVAILABLE,
      isActive: true
    },
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    order: [["createdAt", "DESC"]]
  });
}

export async function getAssetDetails(assetId) {
  const asset = await Asset.findByPk(assetId);

  if (!asset) {
    fail("Asset not found", 404);
  }

  return asset;
}

export async function allocateAsset({
  req,
  employeeId,
  assetId
}) {
  const transaction = await sequelize.transaction(
    transactionOptions
  );

  try {
    const employee = await Employee.findByPk(employeeId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (
      !employee ||
      employee.employmentStatus !== "ACTIVE"
    ) {
      fail("Active employee not found", 404);
    }

    const asset = await Asset.findByPk(assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    assertAssetAvailable(asset);

    const existingAllocation = await AssetAllocation.findOne({
      where: {
        assetId,
        status: ALLOCATION_STATUS.ACTIVE
      },
      transaction
    });

    if (existingAllocation) {
      fail("Asset already has an active allocation", 409);
    }

    const allocation = await AssetAllocation.create({
      assetId: asset.id,
      employeeId: employee.id,
      allocatedBy: actorId(req),
      allocatedAt: new Date(),
      status: ALLOCATION_STATUS.ACTIVE
    }, { transaction });

    const previousStatus = asset.status;

    asset.status = ASSET_STATUS.ALLOCATED;
    await asset.save({ transaction });

    await recordAudit({
      actorId: actorId(req),
      action: "ASSET_ALLOCATED",
      entityType: "Asset",
      entityId: asset.id,
      previousValues: { status: previousStatus },
      newValues: {
        status: asset.status,
        employeeId: employee.id,
        allocationId: allocation.id
      },
      ...requestMetadata(req),
      transaction
    });

    await transaction.commit();
    return allocation;
  } catch (error) {
    await transaction.rollback();

    if (error instanceof OptimisticLockError) {
      error.statusCode = 409;
      error.message =
        "Asset was modified by another operation. Retry.";
    }

    throw error;
  }
}

export async function requestAssetReturn({
  req,
  allocationId,
  condition,
  notes
}) {
  if (!["GOOD", "FAIR", "DAMAGED"].includes(condition)) {
    fail("Invalid return condition");
  }
  const transaction = await sequelize.transaction(
    transactionOptions
  );

  try {
    const allocation = await AssetAllocation.findByPk(
      allocationId,
      {
        transaction,
        lock: transaction.LOCK.UPDATE
      }
    );

    if (
      !allocation ||
      allocation.employeeId !== actorId(req)
    ) {
      fail("Allocation not found", 404);
    }

    if (allocation.status !== ALLOCATION_STATUS.ACTIVE) {
      fail("This allocation cannot be returned", 409);
    }

    const existingRequest = await AssetReturn.findOne({
      where: {
        allocationId,
        status: RETURN_STATUS.PENDING
      },
      transaction
    });

    if (existingRequest) {
      fail("A return request is already pending", 409);
    }

    const assetReturn = await AssetReturn.create({
      allocationId,
      employeeId: allocation.employeeId,
      requestedAt: new Date(),
      requestedCondition: condition,
      employeeRemarks: notes?.trim() || null,
      status: RETURN_STATUS.PENDING
    }, { transaction });

    // Allocation remains ACTIVE until manager inspection.
    await recordAudit({
      actorId: actorId(req),
      action: "ASSET_RETURN_REQUESTED",
      entityType: "AssetReturn",
      entityId: assetReturn.id,
      previousValues: {
        allocationStatus: allocation.status
      },
      newValues: {
        status: assetReturn.status,
        requestedCondition: condition
      },
      ...requestMetadata(req),
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
    fail("Invalid inspection condition");
  }

  if (!["APPROVE", "REJECT"].includes(decision)) {
    fail("Decision must be APPROVE or REJECT");
  }

  const transaction = await sequelize.transaction(
    transactionOptions
  );

  try {
    const assetReturn = await AssetReturn.findByPk(returnId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (
      !assetReturn ||
      assetReturn.status !== RETURN_STATUS.PENDING
    ) {
      fail("Pending return request not found", 404);
    }

    const allocation = await AssetAllocation.findByPk(
      assetReturn.allocationId,
      {
        transaction,
        lock: transaction.LOCK.UPDATE
      }
    );

    if (!allocation) {
      fail("Related allocation not found", 404);
    }

    const asset = await Asset.findByPk(allocation.assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!asset) {
      fail("Related asset not found", 404);
    }

    const previousAssetStatus = asset.status;
    const finalCondition =
      condition || assetReturn.requestedCondition;

    assetReturn.inspectedBy = actorId(req);
    assetReturn.inspectedAt = new Date();
    assetReturn.inspectionRemarks = notes?.trim() || null;

    if (decision === "REJECT") {
      assetReturn.status = RETURN_STATUS.REJECTED;
      await assetReturn.save({ transaction });

      await recordAudit({
        actorId: actorId(req),
        action: "ASSET_RETURN_REJECTED",
        entityType: "AssetReturn",
        entityId: assetReturn.id,
        previousValues: {
          returnStatus: RETURN_STATUS.PENDING
        },
        newValues: {
          returnStatus: assetReturn.status,
          allocationStatus: allocation.status
        },
        ...requestMetadata(req),
        transaction
      });

      await transaction.commit();
      return assetReturn;
    }

    assetReturn.status = RETURN_STATUS.APPROVED;
    await assetReturn.save({ transaction });

    allocation.status = ALLOCATION_STATUS.RETURNED;
    allocation.actualReturnDate = new Date();
    await allocation.save({ transaction });

    asset.condition = finalCondition;

    const needsMaintenance =
      finalCondition === ASSET_CONDITION.DAMAGED;

    asset.status = needsMaintenance
      ? ASSET_STATUS.UNDER_MAINTENANCE
      : ASSET_STATUS.AVAILABLE;

    await asset.save({ transaction });

    if (needsMaintenance) {
      await createMaintenanceTicket({
        assetId: asset.id,
        employeeId: assetReturn.employeeId,
        title: "Maintenance required after asset return",
        description:
          notes?.trim() ||
          "Asset was returned in damaged condition and requires inspection.",
        issueType: "OTHER",
        priority: getPriority(finalCondition),
        transaction
      });
    }

    await recordAudit({
      actorId: actorId(req),
      action: "ASSET_RETURN_APPROVED",
      entityType: "AssetReturn",
      entityId: assetReturn.id,
      previousValues: {
        assetStatus: previousAssetStatus,
        allocationStatus: ALLOCATION_STATUS.ACTIVE
      },
      newValues: {
        returnStatus: assetReturn.status,
        assetStatus: asset.status,
        assetCondition: asset.condition,
        allocationStatus: allocation.status
      },
      ...requestMetadata(req),
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
  priority,
  issueType = "OTHER"
}) {
  const transaction = await sequelize.transaction(
    transactionOptions
  );

  try {
    const asset = await Asset.findByPk(assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!asset) {
      fail("Asset not found", 404);
    }

    if (asset.status === ASSET_STATUS.RETIRED) {
      fail("Damage cannot be reported for a retired asset", 409);
    }

    if (req.user.role === "EMPLOYEE") {
      const activeAllocation = await AssetAllocation.findOne({
        where: {
          assetId,
          employeeId: actorId(req),
          status: ALLOCATION_STATUS.ACTIVE
        },
        transaction
      });

      if (!activeAllocation) {
        fail(
          "You can report damage only for an asset allocated to you",
          403
        );
      }
    }

    const ticket = await createMaintenanceTicket({
      assetId,
      employeeId: actorId(req),
      title: title.trim(),
      description: description.trim(),
      issueType,
      priority: getPriority(
        ASSET_CONDITION.DAMAGED,
        priority
      ),
      transaction
    });

    const previousStatus = asset.status;

    asset.status = ASSET_STATUS.UNDER_MAINTENANCE;
    asset.condition = ASSET_CONDITION.DAMAGED;
    await asset.save({ transaction });

    await recordAudit({
      actorId: actorId(req),
      action: "ASSET_DAMAGE_REPORTED",
      entityType: "MaintenanceTicket",
      entityId: ticket.id,
      previousValues: {
        assetStatus: previousStatus
      },
      newValues: {
        assetStatus: asset.status,
        priority: ticket.priority,
        issueType: ticket.issueType
      },
      ...requestMetadata(req),
      transaction
    });

    await transaction.commit();
    return ticket;
  } catch (error) {
    await transaction.rollback();

    if (error instanceof OptimisticLockError) {
      error.statusCode = 409;
      error.message =
        "Asset changed during damage reporting. Retry.";
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
  const [
    activeAllocations,
    pendingReturns,
    openTickets
  ] = await Promise.all([
    AssetAllocation.count({
      where: {
        employeeId,
        status: ALLOCATION_STATUS.ACTIVE
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
        employeeId,
        status: [
          MAINTENANCE_STATUS.OPEN,
          MAINTENANCE_STATUS.ASSIGNED,
          MAINTENANCE_STATUS.IN_PROGRESS,
          MAINTENANCE_STATUS.ON_HOLD
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
  const transaction = await sequelize.transaction(
    transactionOptions
  );

  try {
    if (
      priority !== undefined &&
      !Object.values(MAINTENANCE_PRIORITY).includes(priority)
    ) {
      fail("Invalid maintenance priority");
    }

    if (
      status !== undefined &&
      !Object.values(MAINTENANCE_STATUS).includes(status)
    ) {
      fail("Invalid maintenance status");
    }

    const ticket = await MaintenanceTicket.findByPk(ticketId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!ticket) {
      fail("Maintenance ticket not found", 404);
    }

    const previousValues = {
      assignedTo: ticket.assignedTo,
      status: ticket.status,
      priority: ticket.priority
    };

    if (assignedTo !== undefined) {
      if (assignedTo === null) {
        ticket.assignedTo = null;
      } else {
        const technician = await Employee.findByPk(assignedTo, {
          transaction
        });

        if (
          !technician ||
          technician.employmentStatus !== "ACTIVE"
        ) {
          fail("Active technician not found", 404);
        }

        ticket.assignedTo = assignedTo;

        if (ticket.status === MAINTENANCE_STATUS.OPEN) {
          ticket.status = MAINTENANCE_STATUS.ASSIGNED;
        }
      }
    }

    const transitions = {
      OPEN: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
      ASSIGNED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
      IN_PROGRESS: ["ON_HOLD", "RESOLVED", "CANCELLED"],
      ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
      RESOLVED: ["CLOSED", "IN_PROGRESS"],
      CLOSED: [],
      CANCELLED: []
    };

    if (status !== undefined) {
      const allowed = transitions[ticket.status] || [];

      if (!allowed.includes(status) && status !== ticket.status) {
        fail(
          `Invalid maintenance transition: ${ticket.status} to ${status}`,
          409
        );
      }

      ticket.status = status;

      if (status === MAINTENANCE_STATUS.RESOLVED) {
        ticket.resolvedAt = new Date();
      }
    }

    if (priority !== undefined) {
      ticket.priority = priority;
    }

    await ticket.save({ transaction });

    await recordAudit({
      actorId: actorId(req),
      action: "MAINTENANCE_TICKET_UPDATED",
      entityType: "MaintenanceTicket",
      entityId: ticket.id,
      previousValues,
      newValues: {
        assignedTo: ticket.assignedTo,
        status: ticket.status,
        priority: ticket.priority
      },
      ...requestMetadata(req),
      transaction
    });

    await transaction.commit();
    return ticket;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function listMaintenanceTickets({
  page = 1,
  limit = 20
} = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  return MaintenanceTicket.findAndCountAll({
    include: [
      { model: Asset, as: "asset" },
      { model: Employee, as: "reportedBy" },
      { model: Employee, as: "assignee" }
    ],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    distinct: true,
    order: [["createdAt", "DESC"]]
  });
}
