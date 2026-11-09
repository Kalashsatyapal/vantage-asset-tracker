
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const AssetReturn = sequelize.define(
  "AssetReturn",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    allocationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "allocation_id"
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "employee_id"
    },
    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "requested_at"
    },
    requestedCondition: {
      type: DataTypes.ENUM("GOOD", "FAIR", "DAMAGED"),
      allowNull: false,
      field: "requested_condition"
    },
    employeeRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "employee_remarks"
    },
    inspectedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "inspected_by"
    },
    inspectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "inspected_at"
    },
    inspectionRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "inspection_remarks"
    },
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "APPROVED",
        "REJECTED",
        "COMPLETED"
      ),
      allowNull: false,
      defaultValue: "PENDING"
    }
  },
  {
    tableName: "asset_returns",
    indexes: [
      { fields: ["allocation_id"] },
      { fields: ["employee_id"] },
      { fields: ["status"] }
    ]
  }
);

export default AssetReturn;
