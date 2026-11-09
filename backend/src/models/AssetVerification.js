
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const AssetVerification = sequelize.define(
  "AssetVerification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "employee_id"
    },
    assetId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "asset_id"
    },
    verificationPeriod: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "verification_period"
    },
    reportedCondition: {
      type: DataTypes.ENUM("NEW", "GOOD", "FAIR", "DAMAGED", "MISSING"),
      allowNull: false,
      field: "reported_condition"
    },
    employeeRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "employee_remarks"
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "verified_at"
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "verified_by"
    },
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "CONFIRMED",
        "DISCREPANCY",
        "MISSING"
      ),
      allowNull: false,
      defaultValue: "PENDING"
    }
  },
  {
    tableName: "asset_verifications",
    indexes: [
      { fields: ["employee_id", "verification_period"] },
      { fields: ["asset_id"] },
      { fields: ["status"] }
    ]
  }
);

export default AssetVerification;
