import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";
const LicenseAssignment = sequelize.define(
  "LicenseAssignment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    licenseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "license_id"
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "employee_id"
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "assigned_by"
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "assigned_at"
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "revoked_at"
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "REVOKED", "EXPIRED"),
      allowNull: false,
      defaultValue: "ACTIVE"
    }
  },
  {
    tableName: "license_assignments",
    indexes: [
      { fields: ["license_id"] },
      { fields: ["employee_id"] },
      { fields: ["status"] }
    ]
  }
);
export default LicenseAssignment;
