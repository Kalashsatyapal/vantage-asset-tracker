
import { provisionEmployee } from "../services/authService.js";
import { validateRegistration } from "../validators/authValidator.js";
import { EMPLOYEE_ROLES } from "../constants/authConstants.js";

export const createEmployeeAccount = async (req, res) => {
  const errors = validateRegistration(req.body);

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Employee validation failed",
      errors,
      requestId: req.requestId
    });
  }

  const allowedRoles = Object.values(EMPLOYEE_ROLES);

  if (
    req.body.role !== undefined &&
    !allowedRoles.includes(req.body.role)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee role",
      requestId: req.requestId
    });
  }

  const employee = await provisionEmployee(
    req.body,
    req.user,
    {
      requestId: req.requestId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    }
  );

  res.status(201).json({
    success: true,
    message: "Employee account provisioned successfully",
    data: {
      employee
    },
    requestId: req.requestId
  });
};
