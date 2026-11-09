
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const Asset = sequelize.define(
  "Asset",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    assetTag: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: "asset_tag"
    },
    serialNumber: {
      type: DataTypes.STRING(120),
      allowNull: true,
      unique: true,
      field: "serial_number"
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    manufacturer: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    modelNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "model_number"
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "category_id"
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "department_id"
    },
    vendorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "vendor_id"
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      field: "purchase_price",
      validate: {
        min: 0
      }
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "purchase_date"
    },
    warrantyExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "warranty_expiry"
    },
    location: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    condition: {
      type: DataTypes.ENUM("NEW", "GOOD", "FAIR", "DAMAGED", "RETIRED"),
      allowNull: false,
      defaultValue: "NEW"
    },
    status: {
      type: DataTypes.ENUM(
        "AVAILABLE",
        "ALLOCATED",
        "UNDER_MAINTENANCE",
        "RESERVED",
        "RETIRED",
        "LOST"
      ),
      allowNull: false,
      defaultValue: "AVAILABLE"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active"
    }
  },
  {
    tableName: "assets",
    version: true,
    indexes: [
      { unique: true, fields: ["asset_tag"] },
      { unique: true, fields: ["serial_number"] },
      { fields: ["category_id"] },
      { fields: ["department_id"] },
      { fields: ["vendor_id"] },
      { fields: ["status"] },
      { fields: ["location"] },
      { fields: ["purchase_date"] }
    ]
  }
);

export default Asset;
