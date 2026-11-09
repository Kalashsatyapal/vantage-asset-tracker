
import { verifyAccessToken } from "../utils/tokenUtils.js";
import { Employee } from "../models/index.js";
import {
  EMPLOYEE_STATUS,
  TOKEN_TYPES
} from "../constants/authConstants.js";
import logger from "../../../config/logger.js";

export const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        requestId: req.requestId
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        requestId: req.requestId
      });
    }

    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
        requestId: req.requestId
      });
    }

    if (
      payload.type !== TOKEN_TYPES.ACCESS ||
      !payload.sub ||
      !payload.jti
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
        requestId: req.requestId
      });
    }

    const employee = await Employee.findByPk(payload.sub);

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Employee account not found",
        requestId: req.requestId
      });
    }

    if (employee.employmentStatus !== EMPLOYEE_STATUS.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: "Employee account is not active",
        requestId: req.requestId
      });
    }

    req.user = {
      id: employee.id,
      employeeCode: employee.employeeCode,
      email: employee.email,
      role: employee.role,
      departmentId: employee.departmentId,
      firstName: employee.firstName,
      lastName: employee.lastName
    };

    req.auth = {
      tokenId: payload.jti,
      expiresAt: payload.exp
    };

    next();
  } catch (error) {
    logger.error("AUTHENTICATION_MIDDLEWARE_FAILED", {
      requestId: req.requestId,
      message: error.message
    });

    next(error);
  }
};
