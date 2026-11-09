
import sequelize from "../../../config/database.js";

import Employee from "./Employee.js";
import Department from "./Department.js";
import AssetCategory from "./AssetCategory.js";
import Asset from "./Asset.js";
import AssetAllocation from "./AssetAllocation.js";
import AssetReturn from "./AssetReturn.js";
import MaintenanceTicket from "./MaintenanceTicket.js";
import SoftwareLicense from "./SoftwareLicense.js";
import LicenseAssignment from "./LicenseAssignment.js";
import AssetTransfer from "./AssetTransfer.js";
import AssetVerification from "./AssetVerification.js";
import Notification from "./Notification.js";
import Vendor from "./Vendor.js";
import MaintenanceSchedule from "./MaintenanceSchedule.js";
import AssetAuditLog from "./AssetAuditLog.js";
import RefreshToken from "./RefreshToken.js";

Employee.belongsTo(Department, {
  foreignKey: "departmentId",
  as: "department",
  onDelete: "RESTRICT"
});

Department.hasMany(Employee, {
  foreignKey: "departmentId",
  as: "employees"
});

Employee.belongsTo(Employee, {
  foreignKey: "managerId",
  as: "manager",
  onDelete: "SET NULL"
});

Employee.hasMany(Employee, {
  foreignKey: "managerId",
  as: "directReports"
});

Asset.belongsTo(AssetCategory, {
  foreignKey: "categoryId",
  as: "category",
  onDelete: "RESTRICT"
});

AssetCategory.hasMany(Asset, {
  foreignKey: "categoryId",
  as: "assets"
});

Asset.belongsTo(Department, {
  foreignKey: "departmentId",
  as: "department",
  onDelete: "SET NULL"
});

Department.hasMany(Asset, {
  foreignKey: "departmentId",
  as: "assets"
});

Asset.belongsTo(Vendor, {
  foreignKey: "vendorId",
  as: "vendor",
  onDelete: "SET NULL"
});

Vendor.hasMany(Asset, {
  foreignKey: "vendorId",
  as: "assets"
});

AssetAllocation.belongsTo(Asset, {
  foreignKey: "assetId",
  as: "asset",
  onDelete: "RESTRICT"
});

Asset.hasMany(AssetAllocation, {
  foreignKey: "assetId",
  as: "allocationHistory"
});

AssetAllocation.belongsTo(Employee, {
  foreignKey: "employeeId",
  as: "employee",
  onDelete: "RESTRICT"
});

Employee.hasMany(AssetAllocation, {
  foreignKey: "employeeId",
  as: "allocations"
});

AssetAllocation.belongsTo(Employee, {
  foreignKey: "allocatedBy",
  as: "allocator",
  onDelete: "RESTRICT"
});

AssetReturn.belongsTo(AssetAllocation, {
  foreignKey: "allocationId",
  as: "allocation",
  onDelete: "RESTRICT"
});

AssetAllocation.hasMany(AssetReturn, {
  foreignKey: "allocationId",
  as: "returnRequests"
});

AssetReturn.belongsTo(Employee, {
  foreignKey: "employeeId",
  as: "employee",
  onDelete: "RESTRICT"
});

AssetReturn.belongsTo(Employee, {
  foreignKey: "inspectedBy",
  as: "inspector",
  onDelete: "SET NULL"
});

MaintenanceTicket.belongsTo(Asset, {
  foreignKey: "assetId",
  as: "asset",
  onDelete: "RESTRICT"
});

Asset.hasMany(MaintenanceTicket, {
  foreignKey: "assetId",
  as: "maintenanceTickets"
});

MaintenanceTicket.belongsTo(Employee, {
  foreignKey: "employeeId",
  as: "reportedBy",
  onDelete: "RESTRICT"
});

MaintenanceTicket.belongsTo(Employee, {
  foreignKey: "assignedTo",
  as: "assignee",
  onDelete: "SET NULL"
});

SoftwareLicense.hasMany(LicenseAssignment, {
  foreignKey: "licenseId",
  as: "assignments"
});

LicenseAssignment.belongsTo(SoftwareLicense, {
  foreignKey: "licenseId",
  as: "license",
  onDelete: "RESTRICT"
});

Employee.hasMany(LicenseAssignment, {
  foreignKey: "employeeId",
  as: "licenseAssignments"
});

LicenseAssignment.belongsTo(Employee, {
  foreignKey: "employeeId",
  as: "employee",
  onDelete: "RESTRICT"
});

LicenseAssignment.belongsTo(Employee, {
  foreignKey: "assignedBy",
  as: "assigner",
  onDelete: "RESTRICT"
});

AssetTransfer.belongsTo(Asset, {
  foreignKey: "assetId",
  as: "asset",
  onDelete: "RESTRICT"
});

Asset.hasMany(AssetTransfer, {
  foreignKey: "assetId",
  as: "transfers"
});

AssetTransfer.belongsTo(Employee, {
  foreignKey: "requestedBy",
  as: "requester",
  onDelete: "RESTRICT"
});

AssetTransfer.belongsTo(Employee, {
  foreignKey: "approvedBy",
  as: "approver",
  onDelete: "SET NULL"
});

AssetTransfer.belongsTo(Department, {
  foreignKey: "fromDepartmentId",
  as: "sourceDepartment",
  onDelete: "RESTRICT"
});

AssetTransfer.belongsTo(Department, {
  foreignKey: "toDepartmentId",
  as: "destinationDepartment",
  onDelete: "RESTRICT"
});

AssetVerification.belongsTo(Employee, {
  foreignKey: "employeeId",
  as: "employee",
  onDelete: "RESTRICT"
});

AssetVerification.belongsTo(Asset, {
  foreignKey: "assetId",
  as: "asset",
  onDelete: "RESTRICT"
});

AssetVerification.belongsTo(Employee, {
  foreignKey: "verifiedBy",
  as: "verifier",
  onDelete: "SET NULL"
});

Notification.belongsTo(Employee, {
  foreignKey: "employeeId",
  as: "employee",
  onDelete: "RESTRICT"
});

Employee.hasMany(Notification, {
  foreignKey: "employeeId",
  as: "notifications"
});

MaintenanceSchedule.belongsTo(Asset, {
  foreignKey: "assetId",
  as: "asset",
  onDelete: "RESTRICT"
});

Asset.hasMany(MaintenanceSchedule, {
  foreignKey: "assetId",
  as: "maintenanceSchedules"
});

MaintenanceSchedule.belongsTo(Employee, {
  foreignKey: "assignedTo",
  as: "assignee",
  onDelete: "SET NULL"
});

Employee.hasMany(RefreshToken, {
  foreignKey: "employeeId",
  as: "refreshTokens"
});

RefreshToken.belongsTo(Employee, {
  foreignKey: "employeeId",
  as: "employee",
  onDelete: "RESTRICT"
});

RefreshToken.belongsTo(RefreshToken, {
  foreignKey: "replacedByTokenId",
  as: "replacementToken",
  onDelete: "SET NULL"
});

export const initializeModels = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Production schema initialization requires versioned database migrations"
    );
  }

  await sequelize.sync();

  return true;
};

export {
  sequelize,
  Employee,
  Department,
  AssetCategory,
  Asset,
  AssetAllocation,
  AssetReturn,
  MaintenanceTicket,
  SoftwareLicense,
  LicenseAssignment,
  AssetTransfer,
  AssetVerification,
  Notification,
  Vendor,
  MaintenanceSchedule,
  AssetAuditLog,
  RefreshToken
};

export default {
  sequelize,
  Employee,
  Department,
  AssetCategory,
  Asset,
  AssetAllocation,
  AssetReturn,
  MaintenanceTicket,
  SoftwareLicense,
  LicenseAssignment,
  AssetTransfer,
  AssetVerification,
  Notification,
  Vendor,
  MaintenanceSchedule,
  AssetAuditLog,
  RefreshToken
};
