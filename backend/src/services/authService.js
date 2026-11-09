import bcrypt from "bcryptjs";
import { Op, Transaction } from "sequelize";
import sequelize from "../../../config/database.js";
import env from "../../../config/env.js";

import {
  Employee,
  Department,
  RefreshToken
} from "../models/index.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  getTokenExpiry
} from "../utils/tokenUtils.js";

import {
  EMPLOYEE_STATUS,
  EMPLOYEE_ROLES,
  TOKEN_TYPES
} from "../constants/authConstants.js";

import { recordAudit } from "./auditService.js";

const dummyPasswordHash = await bcrypt.hash(
  "Vantage_INVALID_LOGIN_PASSWORD",
  env.BCRYPT_ROUNDS
);

const publicEmployee = (employee) => ({
  id: employee.id,
  employeeCode: employee.employeeCode,
  firstName: employee.firstName,
  lastName: employee.lastName,
  email: employee.email,
  phone: employee.phone,
  designation: employee.designation,
  role: employee.role,
  employmentStatus: employee.employmentStatus,
  departmentId: employee.departmentId,
  lastLoginAt: employee.lastLoginAt,
  createdAt: employee.createdAt
});

const createSession = async (employee, transaction) => {
  const accessToken = generateAccessToken(employee);
  const refreshToken = generateRefreshToken(employee);

  const refreshRecord = await RefreshToken.create(
    {
      employeeId: employee.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getTokenExpiry(refreshToken)
    },
    { transaction }
  );

  return {
    accessToken,
    refreshToken,
    refreshTokenId: refreshRecord.id,
    user: publicEmployee(employee)
  };
};

export const registerEmployee = async (data, requestMetadata) => {
  return sequelize.transaction(async (transaction) => {
    const email = data.email.trim().toLowerCase();
    const employeeCode = data.employeeCode.trim().toUpperCase();

    const existingEmployee = await Employee.findOne({
      where: {
        [Op.or]: [
          { email },
          { employeeCode }
        ]
      },
      transaction
    });

    if (existingEmployee) {
      throw Object.assign(
        new Error("Employee email or employee code already exists"),
        { statusCode: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(
      data.password,
      env.BCRYPT_ROUNDS
    );

    const employee = await Employee.create(
      {
        employeeCode,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        passwordHash,
        role: EMPLOYEE_ROLES.EMPLOYEE,
        employmentStatus: EMPLOYEE_STATUS.ACTIVE,
        departmentId: null,
        managerId: null
      },
      { transaction }
    );

    await recordAudit({
      action: "EMPLOYEE_REGISTERED",
      entityType: "EMPLOYEE",
      entityId: employee.id,
      actorId: employee.id,
      requestId: requestMetadata.requestId,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      transaction
    });

    return publicEmployee(employee);
  });
};
export const revokeAllSessions = async (
  employeeId,
  requestMetadata
) => {
  return sequelize.transaction(async (transaction) => {
    const employee = await Employee.findByPk(employeeId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!employee) {
      throw Object.assign(
        new Error("Employee not found"),
        { statusCode: 404 }
      );
    }

    employee.authVersion += 1;
    await employee.save({ transaction });

    await revokeAllEmployeeSessions(
      employeeId,
      transaction,
      requestMetadata
    );

    await recordAudit({
      actorId: employeeId,
      action: "ALL_SESSIONS_REVOKED",
      entityType: "EMPLOYEE",
      entityId: employeeId,
      requestId: requestMetadata.requestId,
      ipAddress: requestMetadata.ipAddress,
      transaction
    });

    return true;
  });
};
export const authenticateEmployee = async (
  email,
  password,
  requestMetadata
) => {
  return sequelize.transaction(async (transaction) => {
    const employee = await Employee.findOne({
      where: {
        email: email.trim().toLowerCase()
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const passwordHash = employee
      ? employee.passwordHash
      : dummyPasswordHash;

    const passwordMatches = await bcrypt.compare(
      password,
      passwordHash
    );

    if (!employee || !passwordMatches) {
      await recordAudit({
        action: "LOGIN_FAILED",
        entityType: "AUTHENTICATION",
        requestId: requestMetadata.requestId,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: {
          reason: "INVALID_CREDENTIALS"
        }
      });

      throw Object.assign(
        new Error("Invalid email or password"),
        { statusCode: 401 }
      );
    }

    if (employee.employmentStatus !== EMPLOYEE_STATUS.ACTIVE) {
      await recordAudit({
        actorId: employee.id,
        action: "LOGIN_BLOCKED",
        entityType: "EMPLOYEE",
        entityId: employee.id,
        requestId: requestMetadata.requestId,
        ipAddress: requestMetadata.ipAddress
      });

      throw Object.assign(
        new Error("Account is not active"),
        { statusCode: 403 }
      );
    }

    employee.lastLoginAt = new Date();

    await employee.save({ transaction });

    const session = await createSession(employee, transaction);

    await recordAudit({
      actorId: employee.id,
      action: "LOGIN_SUCCESS",
      entityType: "EMPLOYEE",
      entityId: employee.id,
      requestId: requestMetadata.requestId,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      transaction
    });

    return session;
  });
};

export const rotateRefreshToken = async (
  token,
  requestMetadata
) => {
  let payload;

  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw Object.assign(
      new Error("Invalid or expired refresh token"),
      { statusCode: 401 }
    );
  }

  if (
    payload.type !== TOKEN_TYPES.REFRESH ||
    !payload.sub ||
    !payload.jti
  ) {
    throw Object.assign(
      new Error("Invalid refresh token"),
      { statusCode: 401 }
    );
  }

  return sequelize.transaction(
    {
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    },
    async (transaction) => {
      const existingToken = await RefreshToken.findOne({
        where: {
          tokenHash: hashToken(token),
          employeeId: payload.sub,
          revokedAt: null,
          expiresAt: {
            [Op.gt]: new Date()
          }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!existingToken) {
        throw Object.assign(
          new Error("Refresh token has already been used or revoked"),
          { statusCode: 401 }
        );
      }

      const employee = await Employee.findByPk(payload.sub, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (
        !employee ||
        employee.employmentStatus !== EMPLOYEE_STATUS.ACTIVE
      ) {
        existingToken.revokedAt = new Date();
        await existingToken.save({ transaction });

        throw Object.assign(
          new Error("Account is not active"),
          { statusCode: 403 }
        );
      }

      const session = await createSession(employee, transaction);

      existingToken.revokedAt = new Date();
      existingToken.revokedByIp = requestMetadata.ipAddress;
      existingToken.replacedByTokenId = session.refreshTokenId;

      await existingToken.save({ transaction });

      await recordAudit({
        actorId: employee.id,
        action: "REFRESH_TOKEN_ROTATED",
        entityType: "AUTHENTICATION",
        entityId: employee.id,
        requestId: requestMetadata.requestId,
        ipAddress: requestMetadata.ipAddress,
        transaction
      });

      return session;
    }
  );
};

export const revokeRefreshToken = async (
  token,
  requestMetadata
) => {
  if (!token) {
    return null;
  }

  let payload;

  try {
    payload = verifyRefreshToken(token);
  } catch {
    return null;
  }

  if (payload.type !== TOKEN_TYPES.REFRESH) {
    return null;
  }

  return sequelize.transaction(async (transaction) => {
    const record = await RefreshToken.findOne({
      where: {
        tokenHash: hashToken(token),
        employeeId: payload.sub,
        revokedAt: null
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!record) {
      return null;
    }

    record.revokedAt = new Date();
    record.revokedByIp = requestMetadata.ipAddress;

    await record.save({ transaction });

    await recordAudit({
      actorId: payload.sub,
      action: "LOGOUT",
      entityType: "AUTHENTICATION",
      entityId: payload.sub,
      requestId: requestMetadata.requestId,
      ipAddress: requestMetadata.ipAddress,
      transaction
    });

    return true;
  });
};

export const revokeAllEmployeeSessions = async (
  employeeId,
  transaction,
  requestMetadata
) => {
  await RefreshToken.update(
    {
      revokedAt: new Date(),
      revokedByIp: requestMetadata.ipAddress
    },
    {
      where: {
        employeeId,
        revokedAt: null
      },
      transaction
    }
  );
};

export const changeEmployeePassword = async (
  employeeId,
  currentPassword,
  newPassword,
  requestMetadata
) => {
  return sequelize.transaction(async (transaction) => {
    const employee = await Employee.findByPk(employeeId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!employee) {
      throw Object.assign(
        new Error("Employee not found"),
        { statusCode: 404 }
      );
    }

    const matches = await bcrypt.compare(
      currentPassword,
      employee.passwordHash
    );

    if (!matches) {
      throw Object.assign(
        new Error("Current password is incorrect"),
        { statusCode: 400 }
      );
    }

    employee.passwordHash = await bcrypt.hash(
      newPassword,
      env.BCRYPT_ROUNDS
    );

    await employee.save({ transaction });

    await revokeAllEmployeeSessions(
      employeeId,
      transaction,
      requestMetadata
    );

    await recordAudit({
      actorId: employeeId,
      action: "PASSWORD_CHANGED",
      entityType: "EMPLOYEE",
      entityId: employeeId,
      requestId: requestMetadata.requestId,
      ipAddress: requestMetadata.ipAddress,
      transaction
    });

    return true;
  });
};

export const provisionEmployee = async (
  data,
  admin,
  requestMetadata
) => {
  return sequelize.transaction(async (transaction) => {
    const email = data.email.trim().toLowerCase();
    const employeeCode = data.employeeCode.trim().toUpperCase();

    const existing = await Employee.findOne({
      where: {
        [Op.or]: [
          { email },
          { employeeCode }
        ]
      },
      transaction
    });

    if (existing) {
      throw Object.assign(
        new Error("Email or employee code already exists"),
        { statusCode: 409 }
      );
    }

    if (
      data.departmentId &&
      !(await Department.findByPk(data.departmentId, { transaction }))
    ) {
      throw Object.assign(
        new Error("Department not found"),
        { statusCode: 400 }
      );
    }

    const employee = await Employee.create(
      {
        employeeCode,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        passwordHash: await bcrypt.hash(
          data.password,
          env.BCRYPT_ROUNDS
        ),
        phone: data.phone || null,
        designation: data.designation || null,
        departmentId: data.departmentId || null,
        role: data.role || EMPLOYEE_ROLES.EMPLOYEE,
        employmentStatus: EMPLOYEE_STATUS.ACTIVE
      },
      { transaction }
    );

    await recordAudit({
      actorId: admin.id,
      action: "EMPLOYEE_PROVISIONED",
      entityType: "EMPLOYEE",
      entityId: employee.id,
      requestId: requestMetadata.requestId,
      ipAddress: requestMetadata.ipAddress,
      newValues: {
        employeeCode: employee.employeeCode,
        email: employee.email,
        role: employee.role,
        departmentId: employee.departmentId
      },
      transaction
    });

    return publicEmployee(employee);
  });
};