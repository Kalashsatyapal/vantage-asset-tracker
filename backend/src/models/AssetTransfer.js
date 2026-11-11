import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";
const AssetTransfer = sequelize.define(
  "AssetTransfer",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    assetId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "asset_id"
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "requested_by"
    },
    fromDepartmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "from_department_id"
    },
    toDepartmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "to_department_id"
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "approved_by"
    },
    requestReason: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "request_reason"
    },
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "APPROVED",
        "REJECTED",
        "COMPLETED",
        "CANCELLED"
      ),
      allowNull: false,
      defaultValue: "PENDING"
    },
    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "requested_at"
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "approved_at"
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at"
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "rejection_reason"
    }
  },
  {
    tableName: "asset_transfers",
    indexes: [
      { fields: ["asset_id"] },
      { fields: ["requested_by"] },
      { fields: ["status"] },
      { fields: ["from_department_id", "to_department_id"] }
    ]
  }
);
export default AssetTransfer;
