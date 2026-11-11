
import { Op, Transaction } from "sequelize";
import sequelize from "../../../config/database.js";

import {
  Employee,
  Asset,
  AssetAllocation,
  AssetCategory,
  Department,
  Vendor,
  MaintenanceSchedule,
  MaintenanceTicket
} from "../models/index.js";

import { recordAudit } from "./auditService.js";

const transactionOptions = {
  isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
};

const assetFields = [
  "name",
  "description",
  "manufacturer",
  "modelNumber",
  "categoryId",
  "departmentId",
  "vendorId",
  "purchasePrice",
  "purchaseDate",
  "warrantyExpiry",
  "location",
  "condition"
];

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function requestMetadata(req) {
  return {
    requestId: req.requestId ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null
  };
}

async function audit(req, action, entityType, entityId, previousValues, newValues, transaction) {
  return recordAudit({
    actorId: req.user.id,
    action,
    entityType,
    entityId,
    previousValues,
    newValues,
    ...requestMetadata(req),
    transaction
  });
}

function pagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

export async function listAssets(query) {
  const { page, limit, offset } = pagination(query);
  const where = {};

  if (query.status) where.status = query.status;
  if (query.condition) where.condition = query.condition;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.vendorId) where.vendorId = query.vendorId;

  if (query.search) {
    where[Op.or] = [
      { assetTag: { [Op.like]: `%${query.search}%` } },
      { name: { [Op.like]: `%${query.search}%` } },
      { serialNumber: { [Op.like]: `%${query.search}%` } }
    ];
  }

  const result = await Asset.findAndCountAll({
    where,
    include: [
      { model: AssetCategory, as: "category" },
      { model: Department, as: "department" },
      { model: Vendor, as: "vendor" }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true
  });

  return {
    total: result.count,
    page,
    limit,
    assets: result.rows
  };
}

export async function createAsset(req, data) {
  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const category = await AssetCategory.findByPk(data.categoryId, {
      transaction
    });

    if (!category || !category.isActive) {
      fail("Active asset category not found", 404);
    }

    if (data.departmentId) {
      const department = await Department.findByPk(data.departmentId, {
        transaction
      });

      if (!department || !department.isActive) {
        fail("Active department not found", 404);
      }
    }

    if (data.vendorId) {
      const vendor = await Vendor.findByPk(data.vendorId, {
        transaction
      });

      if (!vendor || vendor.status !== "ACTIVE") {
        fail("Active vendor not found", 404);
      }
    }

    const asset = await Asset.create(
      {
        assetTag: data.assetTag.trim(),
        serialNumber: data.serialNumber?.trim() || null,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        manufacturer: data.manufacturer?.trim() || null,
        modelNumber: data.modelNumber?.trim() || null,
        categoryId: data.categoryId,
        departmentId: data.departmentId || null,
        vendorId: data.vendorId || null,
        purchasePrice: data.purchasePrice,
        purchaseDate: data.purchaseDate,
        warrantyExpiry: data.warrantyExpiry || null,
        location: data.location?.trim() || null,
        condition: data.condition || "NEW",
        status: "AVAILABLE",
        isActive: true
      },
      { transaction }
    );

    await audit(
      req,
      "ASSET_CREATED",
      "Asset",
      asset.id,
      null,
      asset.toJSON(),
      transaction
    );

    await transaction.commit();
    return asset;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function updateAsset(req, assetId, data) {
  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const asset = await Asset.findByPk(assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!asset) fail("Asset not found", 404);
    if (!asset.isActive) fail("Inactive assets cannot be edited", 409);

    if (data.categoryId) {
      const category = await AssetCategory.findByPk(data.categoryId, {
        transaction
      });

      if (!category || !category.isActive) {
        fail("Active asset category not found", 404);
      }
    }

    if (data.departmentId) {
      const department = await Department.findByPk(data.departmentId, {
        transaction
      });

      if (!department || !department.isActive) {
        fail("Active department not found", 404);
      }
    }

    if (data.vendorId) {
      const vendor = await Vendor.findByPk(data.vendorId, {
        transaction
      });

      if (!vendor || vendor.status !== "ACTIVE") {
        fail("Active vendor not found", 404);
      }
    }

    const previousValues = asset.toJSON();

    for (const field of assetFields) {
      if (data[field] !== undefined) {
        asset[field] = typeof data[field] === "string"
          ? data[field].trim()
          : data[field];
      }
    }

    await asset.save({ transaction });

    await audit(
      req,
      "ASSET_UPDATED",
      "Asset",
      asset.id,
      previousValues,
      asset.toJSON(),
      transaction
    );

    await transaction.commit();
    return asset;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function retireAsset(req, assetId) {
  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const asset = await Asset.findByPk(assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!asset) fail("Asset not found", 404);
    if (asset.status === "RETIRED") fail("Asset is already retired", 409);

    const activeAllocation = await AssetAllocation.findOne({
      where: {
        assetId,
        status: ["ACTIVE", "OVERDUE"]
      },
      transaction
    });

    if (activeAllocation) {
      fail("Return or close the active allocation before retiring this asset", 409);
    }

    const previousValues = {
      status: asset.status,
      condition: asset.condition,
      isActive: asset.isActive
    };

    asset.status = "RETIRED";
    asset.condition = "RETIRED";
    asset.isActive = false;

    await asset.save({ transaction });

    await audit(
      req,
      "ASSET_RETIRED",
      "Asset",
      asset.id,
      previousValues,
      {
        status: asset.status,
        condition: asset.condition,
        isActive: asset.isActive
      },
      transaction
    );

    await transaction.commit();
    return asset;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

const masterModels = {
  categories: {
    model: AssetCategory,
    entityType: "AssetCategory",
    fields: ["name", "code", "description", "usefulLifeYears", "depreciationRate"]
  },
  departments: {
    model: Department,
    entityType: "Department",
    fields: ["name", "code", "description", "location"]
  },
  vendors: {
    model: Vendor,
    entityType: "Vendor",
    fields: ["vendorCode", "companyName", "contactPerson", "email", "phone", "address", "taxRegistrationNumber"]
  }
};

export async function listMasterData(type) {
  const config = masterModels[type];
  if (!config) fail("Invalid master data type");

  return config.model.findAll({
    order: [["createdAt", "DESC"]]
  });
}

export async function createMasterData(req, type, data) {
  const config = masterModels[type];
  if (!config) fail("Invalid master data type");

  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const values = {};

    for (const field of config.fields) {
      if (data[field] !== undefined) {
        values[field] = typeof data[field] === "string"
          ? data[field].trim()
          : data[field];
      }
    }

    if (type === "vendors") {
      values.status = "ACTIVE";
    } else {
      values.isActive = true;
    }

    const record = await config.model.create(values, { transaction });

    await audit(
      req,
      `${config.entityType.toUpperCase()}_CREATED`,
      config.entityType,
      record.id,
      null,
      record.toJSON(),
      transaction
    );

    await transaction.commit();
    return record;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function updateMasterData(req, type, id, data) {
  const config = masterModels[type];
  if (!config) fail("Invalid master data type");

  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const record = await config.model.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!record) fail("Record not found", 404);

    const previousValues = record.toJSON();

    for (const field of config.fields) {
      if (data[field] !== undefined) {
        record[field] = typeof data[field] === "string"
          ? data[field].trim()
          : data[field];
      }
    }

    await record.save({ transaction });

    await audit(
      req,
      `${config.entityType.toUpperCase()}_UPDATED`,
      config.entityType,
      record.id,
      previousValues,
      record.toJSON(),
      transaction
    );

    await transaction.commit();
    return record;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function deactivateMasterData(req, type, id) {
  const config = masterModels[type];
  if (!config) fail("Invalid master data type");

  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const record = await config.model.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!record) fail("Record not found", 404);

    if (type === "vendors") {
      record.status = "INACTIVE";
    } else {
      record.isActive = false;
    }

    await record.save({ transaction });

    await audit(
      req,
      `${config.entityType.toUpperCase()}_DEACTIVATED`,
      config.entityType,
      record.id,
      null,
      record.toJSON(),
      transaction
    );

    await transaction.commit();
    return record;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function createMaintenanceSchedule(req, data) {
  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const asset = await Asset.findByPk(data.assetId, { transaction });

    if (!asset || !asset.isActive) {
      fail("Active asset not found", 404);
    }

    if (data.assignedTo) {
      const employee = await Employee.findByPk(data.assignedTo, {
        transaction
      });
      if (!employee || employee.employmentStatus !== "ACTIVE") {
        fail("Active maintenance assignee not found", 404);
      }
    }

    const schedule = await MaintenanceSchedule.create(
      {
        assetId: data.assetId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        maintenanceType: data.maintenanceType,
        frequencyDays: Number(data.frequencyDays),
        nextMaintenanceAt: data.nextMaintenanceAt,
        assignedTo: data.assignedTo || null,
        status: "ACTIVE"
      },
      { transaction }
    );

    await audit(
      req,
      "MAINTENANCE_SCHEDULE_CREATED",
      "MaintenanceSchedule",
      schedule.id,
      null,
      schedule.toJSON(),
      transaction
    );

    await transaction.commit();
    return schedule;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function listMaintenanceSchedules(query) {
  const { page, limit, offset } = pagination(query);

  const result = await MaintenanceSchedule.findAndCountAll({
    where: query.status ? { status: query.status } : {},
    include: [{ model: Asset, as: "asset" }],
    limit,
    offset,
    order: [["nextMaintenanceAt", "ASC"]]
  });

  return {
    total: result.count,
    page,
    limit,
    schedules: result.rows
  };
}

export async function updateMaintenanceSchedule(req, scheduleId, data) {
  const transaction = await sequelize.transaction(transactionOptions);

  try {
    const schedule = await MaintenanceSchedule.findByPk(scheduleId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!schedule) fail("Maintenance schedule not found", 404);

    const previousValues = schedule.toJSON();
    const allowed = [
      "title",
      "description",
      "maintenanceType",
      "frequencyDays",
      "lastMaintenanceAt",
      "nextMaintenanceAt",
      "assignedTo",
      "status"
    ];

    for (const field of allowed) {
      if (data[field] !== undefined) {
        schedule[field] = typeof data[field] === "string"
          ? data[field].trim()
          : data[field];
      }
    }

    if (schedule.assignedTo) {
      const { Employee } = await import("../models/index.js");
      const employee = await Employee.findByPk(schedule.assignedTo, {
        transaction
      });

      if (!employee || employee.employmentStatus !== "ACTIVE") {
        fail("Active maintenance assignee not found", 404);
      }
    }

    await schedule.save({ transaction });

    await audit(
      req,
      "MAINTENANCE_SCHEDULE_UPDATED",
      "MaintenanceSchedule",
      schedule.id,
      previousValues,
      schedule.toJSON(),
      transaction
    );

    await transaction.commit();
    return schedule;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getAssetManagementDashboard() {
  const [
    totalAssets,
    availableAssets,
    allocatedAssets,
    maintenanceAssets,
    retiredAssets,
    activeSchedules,
    overdueSchedules,
    openTickets
  ] = await Promise.all([
    Asset.count({ where: { isActive: true } }),
    Asset.count({ where: { isActive: true, status: "AVAILABLE" } }),
    Asset.count({ where: { isActive: true, status: "ALLOCATED" } }),
    Asset.count({ where: { isActive: true, status: "UNDER_MAINTENANCE" } }),
    Asset.count({ where: { status: "RETIRED" } }),
    MaintenanceSchedule.count({ where: { status: "ACTIVE" } }),
    MaintenanceSchedule.count({
      where: {
        status: "ACTIVE",
        nextMaintenanceAt: { [Op.lt]: new Date() }
      }
    }),
    MaintenanceTicket.count({
      where: {
        status: ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD"]
      }
    })
  ]);

  return {
    totalAssets,
    availableAssets,
    allocatedAssets,
    maintenanceAssets,
    retiredAssets,
    activeSchedules,
    overdueSchedules,
    openTickets
  };
}
