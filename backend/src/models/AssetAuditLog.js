
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const AssetAuditLog = sequelize.define(
  "AssetAuditLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "actor_id"
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    entityType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "entity_type"
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "entity_id"
    },
    previousValues: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "previous_values"
    },
    newValues: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "new_values"
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: "ip_address"
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "user_agent"
    },
    requestId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "request_id"
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  {
    tableName: "asset_audit_logs",
    paranoid: false,
    version: false,
    updatedAt: false,
    indexes: [
      { fields: ["actor_id"] },
      { fields: ["entity_type", "entity_id"] },
      { fields: ["action"] },
      { fields: ["created_at"] },
      { fields: ["request_id"] }
    ],
    hooks: {
      beforeUpdate() {
        throw new Error("Audit records cannot be modified");
      },
      beforeDestroy() {
        throw new Error("Audit records cannot be deleted");
      },
      beforeBulkUpdate() {
        throw new Error("Bulk audit modification is prohibited");
      },
      beforeBulkDestroy() {
        throw new Error("Bulk audit deletion is prohibited");
      }
    }
  }
);

export default AssetAuditLog;
