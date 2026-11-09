
import { Employee, Department } from "../models/index.js";
import { validateProfileUpdate } from "../validators/authValidator.js";
import { recordAudit } from "../services/auditService.js";

const publicProfile = (employee) => ({
  id: employee.id,
  employeeCode: employee.employeeCode,
  firstName: employee.firstName,
  lastName: employee.lastName,
  email: employee.email,
  phone: employee.phone,
  designation: employee.designation,
  role: employee.role,
  employmentStatus: employee.employmentStatus,
  department: employee.department
    ? {
        id: employee.department.id,
        name: employee.department.name,
        code: employee.department.code
      }
    : null,
  lastLoginAt: employee.lastLoginAt,
  createdAt: employee.createdAt
});

export const getMyProfile = async (req, res) => {
  const employee = await Employee.findByPk(req.user.id, {
    attributes: { exclude: ["passwordHash"] },
    include: [
      {
        model: Department,
        as: "department",
        attributes: ["id", "name", "code"]
      }
    ]
  });

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found",
      requestId: req.requestId
    });
  }

  res.status(200).json({
    success: true,
    data: {
      employee: publicProfile(employee)
    },
    requestId: req.requestId
  });
};

export const updateMyProfile = async (req, res) => {
  const errors = validateProfileUpdate(req.body);

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Profile validation failed",
      errors,
      requestId: req.requestId
    });
  }

  const employee = await Employee.findByPk(req.user.id);

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found",
      requestId: req.requestId
    });
  }

  const previousValues = {
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone,
    designation: employee.designation
  };

  for (const field of [
    "firstName",
    "lastName",
    "phone",
    "designation"
  ]) {
    if (req.body[field] !== undefined) {
      employee[field] =
        typeof req.body[field] === "string"
          ? req.body[field].trim()
          : req.body[field];
    }
  }

  await employee.save();

  await recordAudit({
    actorId: employee.id,
    action: "EMPLOYEE_PROFILE_UPDATED",
    entityType: "EMPLOYEE",
    entityId: employee.id,
    previousValues,
    newValues: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone,
      designation: employee.designation
    },
    requestId: req.requestId,
    ipAddress: req.ip
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        designation: employee.designation,
        role: employee.role
      }
    },
    requestId: req.requestId
  });
};
