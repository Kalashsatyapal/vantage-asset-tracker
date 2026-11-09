
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const AssetAllocation = sequelize.define(
  "AssetAllocation",
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
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "employee_id"
    },
    allocatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "allocated_by"
    },
    allocatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "allocated_at"
    },
    expectedReturnDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "expected_return_date"
    },
    actualReturnDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "actual_return_date"
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "RETURNED", "OVERDUE", "CANCELLED"),
      allowNull: false,
      defaultValue: "ACTIVE"
    },
    allocationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "allocation_notes"
    }
  },
  {
    tableName: "asset_allocations",
    indexes: [
      { fields: ["asset_id"] },
      { fields: ["employee_id"] },
      { fields: ["status"] },
      { fields: ["expected_return_date"] }
    ]
  }
);

export default AssetAllocation;
