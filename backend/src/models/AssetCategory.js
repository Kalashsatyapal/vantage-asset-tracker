
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const AssetCategory = sequelize.define(
  "AssetCategory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
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
    usefulLifeYears: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 1,
        max: 100
      },
      field: "useful_life_years"
    },
    depreciationRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 20,
      field: "depreciation_rate"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active"
    }
  },
  {
    tableName: "asset_categories"
  }
);

export default AssetCategory;
