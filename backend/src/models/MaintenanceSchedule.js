
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const MaintenanceSchedule = sequelize.define(
  "MaintenanceSchedule",
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
    title: {
      type: DataTypes.STRING(180),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    maintenanceType: {
      type: DataTypes.ENUM(
        "PREVENTATIVE",
        "INSPECTION",
        "CALIBRATION",
        "CLEANING",
        "UPGRADE"
      ),
      allowNull: false,
      field: "maintenance_type"
    },
    frequencyDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
      field: "frequency_days"
    },
    lastMaintenanceAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_maintenance_at"
    },
    nextMaintenanceAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "next_maintenance_at"
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "assigned_to"
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"),
      allowNull: false,
      defaultValue: "ACTIVE"
    }
  },
  {
    tableName: "maintenance_schedules",
    indexes: [
      { fields: ["asset_id"] },
      { fields: ["next_maintenance_at", "status"] }
    ]
  }
);

export default MaintenanceSchedule;
