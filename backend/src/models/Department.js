
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const Department = sequelize.define(
  "Department",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: "is_active"
    }
  },
  {
    tableName: "departments",
    indexes: [
      { unique: true, fields: ["name"] },
      { unique: true, fields: ["code"] }
    ]
  }
);

export default Department;
