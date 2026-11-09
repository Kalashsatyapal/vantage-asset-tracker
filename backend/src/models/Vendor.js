
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const Vendor = sequelize.define(
  "Vendor",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    vendorCode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: "vendor_code"
    },
    companyName: {
      type: DataTypes.STRING(180),
      allowNull: false,
      field: "company_name"
    },
    contactPerson: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: "contact_person"
    },
    email: {
      type: DataTypes.STRING(190),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(25),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    taxRegistrationNumber: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: "tax_registration_number"
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE", "BLOCKED"),
      allowNull: false,
      defaultValue: "ACTIVE"
    }
  },
  {
    tableName: "vendors",
    indexes: [
      { unique: true, fields: ["vendor_code"] },
      { fields: ["company_name"] },
      { fields: ["status"] }
    ]
  }
);

export default Vendor;
