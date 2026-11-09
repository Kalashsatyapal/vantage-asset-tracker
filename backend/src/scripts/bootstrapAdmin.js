import "../../../config/env.js";
import bcrypt from "bcryptjs";
import sequelize from "../../../config/database.js";
import logger from "../../../config/logger.js";
import env from "../../../config/env.js";

import {
  Employee,
  Department
} from "../models/index.js";

const bootstrapAdmin = async () => {
  const required = [
    "BOOTSTRAP_ADMIN_CODE",
    "BOOTSTRAP_ADMIN_FIRST_NAME",
    "BOOTSTRAP_ADMIN_LAST_NAME",
    "BOOTSTRAP_ADMIN_EMAIL",
    "BOOTSTRAP_ADMIN_PASSWORD"
  ];

  const missing = required.filter(
    (key) => !process.env[key]?.trim()
  );

  if (missing.length) {
    throw new Error(
      `Missing bootstrap configuration: ${missing.join(", ")}`
    );
  }

  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (
    password.length < 12 ||
    password.length > 72 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error("Bootstrap password does not meet security requirements");
  }

  await sequelize.authenticate();

  const existingAdmin = await Employee.findOne({
    where: {
      role: "ADMIN"
    }
  });

  if (existingAdmin) {
    throw new Error(
      "An administrator already exists. Bootstrap operation denied."
    );
  }

  const departmentId =
    process.env.BOOTSTRAP_ADMIN_DEPARTMENT_ID || null;

  if (departmentId) {
    const department = await Department.findByPk(departmentId);

    if (!department) {
      throw new Error("Bootstrap department does not exist");
    }
  }

  const employee = await Employee.create({
    employeeCode: process.env.BOOTSTRAP_ADMIN_CODE.trim().toUpperCase(),
    firstName: process.env.BOOTSTRAP_ADMIN_FIRST_NAME.trim(),
    lastName: process.env.BOOTSTRAP_ADMIN_LAST_NAME.trim(),
    email: process.env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(
      password,
      env.BCRYPT_ROUNDS
    ),
    role: "ADMIN",
    employmentStatus: "ACTIVE",
    departmentId
  });

  logger.info("ASTRAVA_INITIAL_ADMIN_CREATED", {
    employeeId: employee.id,
    employeeCode: employee.employeeCode
  });

  process.stdout.write(
    `Administrator created successfully: ${employee.email}\n`
  );
};

try {
  await bootstrapAdmin();
} catch (error) {
  logger.error("ASTRAVA_ADMIN_BOOTSTRAP_FAILED", {
    message: error.message
  });

  process.exitCode = 1;
} finally {
  await sequelize.close();
}