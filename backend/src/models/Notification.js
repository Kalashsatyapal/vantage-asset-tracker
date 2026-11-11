import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";
const Notification = sequelize.define(
  "Notification",
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
    title: {
      type: DataTypes.STRING(180),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM(
        "ASSET",
        "RETURN",
        "MAINTENANCE",
        "LICENSE",
        "TRANSFER",
        "SYSTEM",
        "SECURITY"
      ),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM("LOW", "NORMAL", "HIGH", "URGENT"),
      allowNull: false,
      defaultValue: "NORMAL"
    },
    referenceType: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: "reference_type"
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "reference_id"
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_read"
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "read_at"
    }
  },
  {
    tableName: "notifications",
    indexes: [
      { fields: ["employee_id", "is_read"] },
      { fields: ["created_at"] },
      { fields: ["type"] }
    ]
  }
);
export default Notification;
