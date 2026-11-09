
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const MaintenanceTicket = sequelize.define(
  "MaintenanceTicket",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ticketNumber: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: "ticket_number"
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
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "assigned_to"
    },
    title: {
      type: DataTypes.STRING(180),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    issueType: {
      type: DataTypes.ENUM(
        "HARDWARE",
        "SOFTWARE",
        "NETWORK",
        "OTHER"
      ),
      allowNull: false,
      field: "issue_type"
    },
    priority: {
      type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
      allowNull: false,
      defaultValue: "MEDIUM"
    },
    status: {
      type: DataTypes.ENUM(
        "OPEN",
        "ASSIGNED",
        "IN_PROGRESS",
        "ON_HOLD",
        "RESOLVED",
        "CLOSED",
        "CANCELLED"
      ),
      allowNull: false,
      defaultValue: "OPEN"
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estimatedCost: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
      field: "estimated_cost"
    },
    actualCost: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
      field: "actual_cost"
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "resolved_at"
    }
  },
  {
    tableName: "maintenance_tickets",
    indexes: [
      { unique: true, fields: ["ticket_number"] },
      { fields: ["asset_id"] },
      { fields: ["employee_id"] },
      { fields: ["assigned_to"] },
      { fields: ["priority", "status"] }
    ]
  }
);

export default MaintenanceTicket;
