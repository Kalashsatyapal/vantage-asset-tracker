
import { Op, Transaction } from "sequelize";

import sequelize from "../../../config/database.js";

import {
  Asset,
  AssetAllocation,
  AssetAuditLog,
  Employee,
  Notification
} from "../models/index.js";

import { recordAudit } from "./auditService.js";

const txOptions = {
  isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
};

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function csvCell(value) {
  if (value === null || value === undefined) return "";

  let output = typeof value === "object"
    ? JSON.stringify(value)
    : String(value);

  if (/^[=+\-@\t\r]/.test(output)) {
    output = `'${output}`;
  }

  return `"${output.replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
  return [
    headers.map(csvCell).join(","),
    ...rows.map(row => row.map(csvCell).join(","))
  ].join("\r\n");
}

function dateFilter(query) {
  const where = {};

  if (query.from || query.to) {
    where.createdAt = {};

    if (query.from) {
      const from = new Date(query.from);
      if (Number.isNaN(from.getTime())) fail("Invalid from date");
      where.createdAt[Op.gte] = from;
    }

    if (query.to) {
      const to = new Date(query.to);
      if (Number.isNaN(to.getTime())) fail("Invalid to date");
      to.setHours(23, 59, 59, 999);
      where.createdAt[Op.lte] = to;
    }
  }

  return where;
}

export async function exportAssets() {
  const assets = await Asset.findAll({
    include: [
      { model: Employee, required: false }
    ],
    order: [["createdAt", "DESC"]],
    limit: 50000
  }).catch(async () => Asset.findAll({
    order: [["createdAt", "DESC"]],
    limit: 50000
  }));

  const headers = [
    "Asset Tag",
    "Serial Number",
    "Name",
    "Manufacturer",
    "Model Number",
    "Category ID",
    "Department ID",
    "Vendor ID",
    "Purchase Price",
    "Purchase Date",
    "Warranty Expiry",
    "Location",
    "Condition",
    "Status",
    "Active",
    "Created At"
  ];

  const rows = assets.map(asset => [
    asset.assetTag,
    asset.serialNumber,
    asset.name,
    asset.manufacturer,
    asset.modelNumber,
    asset.categoryId,
    asset.departmentId,
    asset.vendorId,
    asset.purchasePrice,
    asset.purchaseDate,
    asset.warrantyExpiry,
    asset.location,
    asset.condition,
    asset.status,
    asset.isActive,
    asset.createdAt
  ]);

  return toCsv(headers, rows);
}

export async function exportAllocations() {
  const allocations = await AssetAllocation.findAll({
    include: [
      {
        model: Asset,
        as: "asset",
        attributes: ["assetTag", "name", "serialNumber"]
      },
      {
        model: Employee,
        as: "employee",
        attributes: ["employeeCode", "firstName", "lastName", "email"]
      }
    ],
    order: [["allocatedAt", "DESC"]],
    limit: 50000
  });

  const headers = [
    "Allocation ID",
    "Asset Tag",
    "Asset Name",
    "Serial Number",
    "Employee Code",
    "Employee Name",
    "Employee Email",
    "Allocated By",
    "Allocated At",
    "Expected Return Date",
    "Actual Return Date",
    "Status",
    "Notes"
  ];

  const rows = allocations.map(item => [
    item.id,
    item.asset?.assetTag,
    item.asset?.name,
    item.asset?.serialNumber,
    item.employee?.employeeCode,
    [item.employee?.firstName, item.employee?.lastName].filter(Boolean).join(" "),
    item.employee?.email,
    item.allocatedBy,
    item.allocatedAt,
    item.expectedReturnDate,
    item.actualReturnDate,
    item.status,
    item.allocationNotes
  ]);

  return toCsv(headers, rows);
}

export async function exportAuditLogs(query = {}) {
  const logs = await AssetAuditLog.findAll({
    where: dateFilter(query),
    order: [["createdAt", "DESC"]],
    limit: 50000
  });

  const headers = [
    "Audit ID",
    "Actor ID",
    "Action",
    "Entity Type",
    "Entity ID",
    "Previous Values",
    "New Values",
    "IP Address",
    "User Agent",
    "Request ID",
    "Metadata",
    "Created At"
  ];

  const rows = logs.map(log => [
    log.id,
    log.actorId,
    log.action,
    log.entityType,
    log.entityId,
    log.previousValues,
    log.newValues,
    log.ipAddress,
    log.userAgent,
    log.requestId,
    log.metadata,
    log.createdAt
  ]);

  return toCsv(headers, rows);
}

export async function listOverdueAllocations({
  page = 1,
  limit = 20
} = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const result = await AssetAllocation.findAndCountAll({
    where: { status: "OVERDUE" },
    include: [
      {
        model: Asset,
        as: "asset",
        attributes: ["id", "assetTag", "name", "serialNumber"]
      },
      {
        model: Employee,
        as: "employee",
        attributes: ["id", "employeeCode", "firstName", "lastName", "email"]
      }
    ],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    order: [["expectedReturnDate", "ASC"]],
    distinct: true
  });

  return {
    total: result.count,
    page: safePage,
    limit: safeLimit,
    allocations: result.rows
  };
}

export async function processOverdueAllocations(req) {
  const transaction = await sequelize.transaction(txOptions);

  try {
    const today = new Date().toISOString().slice(0, 10);

    const allocations = await AssetAllocation.findAll({
      where: {
        status: "ACTIVE",
        expectedReturnDate: {
          [Op.lt]: today
        }
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
      skipLocked: true
    });

    let processed = 0;

    for (const allocation of allocations) {
      allocation.status = "OVERDUE";
      await allocation.save({ transaction });

      const [asset, employee] = await Promise.all([
        Asset.findByPk(allocation.assetId, { transaction }),
        Employee.findByPk(allocation.employeeId, { transaction })
      ]);

      if (employee) {
        await Notification.create({
          employeeId: employee.id,
          title: "Asset return overdue",
          message: `The return date for asset ${asset?.assetTag || allocation.assetId} has passed. Please contact your asset manager.`,
          type: "RETURN",
          priority: "HIGH",
          referenceType: "AssetAllocation",
          referenceId: allocation.id,
          isRead: false
        }, { transaction });
      }

      await recordAudit({
        actorId: req.user.id,
        action: "ASSET_ALLOCATION_MARKED_OVERDUE",
        entityType: "AssetAllocation",
        entityId: allocation.id,
        previousValues: {
          status: "ACTIVE"
        },
        newValues: {
          status: "OVERDUE",
          expectedReturnDate: allocation.expectedReturnDate
        },
        requestId: req.requestId ?? null,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        transaction
      });

      processed += 1;
    }

    await transaction.commit();

    return {
      processed,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
