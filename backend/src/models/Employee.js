
import { DataTypes } from "sequelize";
import sequelize from "../../../config/database.js";

const Employee = sequelize.define(
  "Employee",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    employeeCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: "employee_code"
    },
    firstName: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: "first_name"
    },
    lastName: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: "last_name"
    },
    email: {
      type: DataTypes.STRING(190),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password_hash"
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM("EMPLOYEE", "ADMIN", "ASSET_MANAGER"),
      allowNull: false,
      defaultValue: "EMPLOYEE"
    },
    employmentStatus: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE", "SUSPENDED"),
      allowNull: false,
      defaultValue: "ACTIVE",
      field: "employment_status"
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "department_id"
    },
    managerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "manager_id"
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login_at"
    },
    authVersion: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: "auth_version"
    }
  },
  {
    tableName: "employees",
    indexes: [
      { unique: true, fields: ["employee_code"] },
      { unique: true, fields: ["email"] },
      { fields: ["department_id"] },
      { fields: ["employment_status"] },
      { fields: ["manager_id"] }
    ]
  }
);

export default Employee;
