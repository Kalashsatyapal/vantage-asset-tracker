
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const SoftwareLicense = sequelize.define(
  "SoftwareLicense",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    softwareName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "software_name"
    },
    vendorName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "vendor_name"
    },
    licenseKeyEncrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "license_key_encrypted"
    },
    licenseType: {
      type: DataTypes.ENUM(
        "INDIVIDUAL",
        "TEAM",
        "ENTERPRISE",
        "SUBSCRIPTION"
      ),
      allowNull: false,
      field: "license_type"
    },
    totalSeats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
      field: "total_seats"
    },
    availableSeats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "available_seats",
      validate: { min: 0 }
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "purchase_date"
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "expiry_date"
    },
    costPerSeat: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: "cost_per_seat"
    },
    status: {
      type: DataTypes.ENUM(
        "ACTIVE",
        "EXPIRED",
        "SUSPENDED",
        "CANCELLED"
      ),
      allowNull: false,
      defaultValue: "ACTIVE"
    }
  },
  {
    tableName: "software_licenses",
    indexes: [
      { fields: ["software_name"] },
      { fields: ["status"] },
      { fields: ["expiry_date"] }
    ],
    validate: {
      seatsAreValid() {
        if (
          this.totalSeats !== undefined &&
          this.availableSeats !== undefined &&
          this.availableSeats > this.totalSeats
        ) {
          throw new Error("Available seats cannot exceed total seats");
        }
      }
    }
  }
);

export default SoftwareLicense;
