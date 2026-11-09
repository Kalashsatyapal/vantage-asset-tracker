
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const RefreshToken = sequelize.define(
  "RefreshToken",
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
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: "token_hash"
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at"
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "revoked_at"
    },
    replacedByTokenId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "replaced_by_token_id"
    },
    createdByIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: "created_by_ip"
    },
    revokedByIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: "revoked_by_ip"
    }
  },
  {
    tableName: "refresh_tokens",
    indexes: [
      { unique: true, fields: ["token_hash"] },
      { fields: ["employee_id", "revoked_at"] },
      { fields: ["expires_at"] }
    ]
  }
);

export default RefreshToken;
