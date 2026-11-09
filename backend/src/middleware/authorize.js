
import { EMPLOYEE_ROLES } from "../constants/authConstants.js";

export const authorize = (...allowedRoles) => {
  const validRoles = Object.values(EMPLOYEE_ROLES);

  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => !validRoles.includes(role))
  ) {
    throw new Error("Invalid authorization role configuration");
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        requestId: req.requestId
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        requestId: req.requestId
      });
    }

    next();
  };
};

export const requireAdmin = authorize(EMPLOYEE_ROLES.ADMIN);

export const requireAssetManager = authorize(
  EMPLOYEE_ROLES.ADMIN,
  EMPLOYEE_ROLES.ASSET_MANAGER
);
