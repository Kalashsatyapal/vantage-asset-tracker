
import { EMPLOYEE_ROLES } from "../constants/authConstants.js";

export const requireDepartmentAccess = (getDepartmentId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        requestId: req.requestId
      });
    }

    if (req.user.role === EMPLOYEE_ROLES.ADMIN) {
      return next();
    }

    const requestedDepartmentId = getDepartmentId(req);

    if (
      !requestedDepartmentId ||
      requestedDepartmentId !== req.user.departmentId
    ) {
      return res.status(403).json({
        success: false,
        message: "Department access denied",
        requestId: req.requestId
      });
    }

    next();
  };
};
