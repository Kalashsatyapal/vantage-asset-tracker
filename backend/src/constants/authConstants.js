
export const EMPLOYEE_ROLES = Object.freeze({
  EMPLOYEE: "EMPLOYEE",
  ASSET_MANAGER: "ASSET_MANAGER",
  ADMIN: "ADMIN"
});

export const EMPLOYEE_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED"
});

export const TOKEN_TYPES = Object.freeze({
  ACCESS: "access",
  REFRESH: "refresh"
});

export const AUTH_MESSAGES = Object.freeze({
  INVALID_CREDENTIALS: "Invalid email or password",
  ACCOUNT_INACTIVE: "Account is not active",
  UNAUTHORIZED: "Authentication required",
  FORBIDDEN: "You do not have permission to perform this action",
  INVALID_TOKEN: "Invalid or expired authentication token",
  PASSWORD_MISMATCH: "Current password is incorrect"
});
