import env from "../../../config/env.js";
import {
  registerEmployee,
  authenticateEmployee,
  rotateRefreshToken,
  revokeRefreshToken,
  changeEmployeePassword,
  revokeAllSessions
} from "../services/authService.js";
import {
  validateRegistration,
  validateLogin,
  validatePasswordChange
} from "../validators/authValidator.js";
import {
  setRefreshCookie,
  clearRefreshCookie
} from "../utils/cookieUtils.js";
const requestMetadata = (req) => ({
  requestId: req.requestId,
  ipAddress: req.ip,
  userAgent: req.get("user-agent")
});
const sendValidationErrors = (res, errors, requestId) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
    requestId
  });
};
export const register = async (req, res) => {
  if (process.env.REGISTRATION_ENABLED !== "true") {
    return res.status(403).json({
      success: false,
      message: "Self-registration is currently disabled",
      requestId: req.requestId
    });
  }
  const errors = validateRegistration(req.body);
  if (errors.length) {
    return sendValidationErrors(res, errors, req.requestId);
  }
  const employee = await registerEmployee(
    req.body,
    requestMetadata(req)
  );
  res.status(201).json({
    success: true,
    message: "Employee registered successfully",
    data: {
      employee
    },
    requestId: req.requestId
  });
};
export const login = async (req, res) => {
  const errors = validateLogin(req.body);
  if (errors.length) {
    return sendValidationErrors(res, errors, req.requestId);
  }
  const session = await authenticateEmployee(
    req.body.email,
    req.body.password,
    requestMetadata(req)
  );
  setRefreshCookie(res, session.refreshToken);
  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      accessToken: session.accessToken,
      tokenType: "Bearer",
      expiresIn: env.JWT_EXPIRES_IN,
      employee: session.user
    },
    requestId: req.requestId
  });
};
export const refresh = async (req, res) => {
  const refreshToken = req.cookies?.[env.COOKIE_NAME];
  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh session not found",
      requestId: req.requestId
    });
  }
  const session = await rotateRefreshToken(
    refreshToken,
    requestMetadata(req)
  );
  setRefreshCookie(res, session.refreshToken);
  res.status(200).json({
    success: true,
    message: "Session refreshed successfully",
    data: {
      accessToken: session.accessToken,
      tokenType: "Bearer",
      expiresIn: env.JWT_EXPIRES_IN,
      employee: session.user
    },
    requestId: req.requestId
  });
};
export const logout = async (req, res) => {
  const refreshToken = req.cookies?.[env.COOKIE_NAME];
  await revokeRefreshToken(
    refreshToken,
    requestMetadata(req)
  );
  clearRefreshCookie(res);
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
    requestId: req.requestId
  });
};
export const logoutAll = async (req, res) => {
  await revokeAllSessions(
    req.user.id,
    requestMetadata(req)
  );
  clearRefreshCookie(res);
  res.status(200).json({
    success: true,
    message: "All sessions have been revoked",
    requestId: req.requestId
  });
};
export const changePassword = async (req, res) => {
  const errors = validatePasswordChange(req.body);
  if (errors.length) {
    return sendValidationErrors(res, errors, req.requestId);
  }
  await changeEmployeePassword(
    req.user.id,
    req.body.currentPassword,
    req.body.newPassword,
    requestMetadata(req)
  );
  clearRefreshCookie(res);
  res.status(200).json({
    success: true,
    message: "Password changed successfully. Please log in again.",
    requestId: req.requestId
  });
};
