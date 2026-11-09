
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYEE_CODE_REGEX = /^[A-Za-z0-9_-]{3,30}$/;

export const validateRegistration = (data) => {
  const errors = [];

  const {
    employeeCode,
    firstName,
    lastName,
    email,
    password
  } = data;

  if (
    typeof employeeCode !== "string" ||
    !EMPLOYEE_CODE_REGEX.test(employeeCode.trim())
  ) {
    errors.push("Valid employee code is required");
  }

  if (
    typeof firstName !== "string" ||
    firstName.trim().length < 2 ||
    firstName.trim().length > 80
  ) {
    errors.push("First name must contain 2 to 80 characters");
  }

  if (
    typeof lastName !== "string" ||
    lastName.trim().length < 2 ||
    lastName.trim().length > 80
  ) {
    errors.push("Last name must contain 2 to 80 characters");
  }

  if (
    typeof email !== "string" ||
    email.length > 190 ||
    !EMAIL_REGEX.test(email.trim())
  ) {
    errors.push("Valid email address is required");
  }

  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 72 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    errors.push(
      "Password must be 12-72 characters and include uppercase, lowercase, number and special character"
    );
  }

  return errors;
};

export const validateLogin = (data) => {
  const errors = [];

  if (
    typeof data.email !== "string" ||
    !EMAIL_REGEX.test(data.email.trim())
  ) {
    errors.push("Valid email address is required");
  }

  if (
    typeof data.password !== "string" ||
    data.password.length === 0 ||
    data.password.length > 72
  ) {
    errors.push("Password is required");
  }

  return errors;
};

export const validatePasswordChange = (data) => {
  const errors = [];

  if (
    typeof data.currentPassword !== "string" ||
    !data.currentPassword
  ) {
    errors.push("Current password is required");
  }

  if (
    typeof data.newPassword !== "string" ||
    data.newPassword.length < 12 ||
    data.newPassword.length > 72 ||
    !/[a-z]/.test(data.newPassword) ||
    !/[A-Z]/.test(data.newPassword) ||
    !/[0-9]/.test(data.newPassword) ||
    !/[^A-Za-z0-9]/.test(data.newPassword)
  ) {
    errors.push("New password does not meet security requirements");
  }

  if (data.currentPassword === data.newPassword) {
    errors.push("New password must differ from current password");
  }

  return errors;
};

export const validateProfileUpdate = (data) => {
  const errors = [];

  const allowedFields = [
    "firstName",
    "lastName",
    "phone",
    "designation"
  ];

  const suppliedFields = Object.keys(data);

  if (suppliedFields.length === 0) {
    errors.push("At least one profile field is required");
  }

  const unexpectedFields = suppliedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (unexpectedFields.length > 0) {
    errors.push("Profile contains unsupported fields");
  }

  for (const field of ["firstName", "lastName"]) {
    if (
      data[field] !== undefined &&
      (typeof data[field] !== "string" ||
        data[field].trim().length < 2 ||
        data[field].trim().length > 80)
    ) {
      errors.push(`${field} must contain 2 to 80 characters`);
    }
  }

  if (
    data.phone !== undefined &&
    data.phone !== null &&
    (typeof data.phone !== "string" ||
      !/^\+?[0-9\s-]{7,20}$/.test(data.phone))
  ) {
    errors.push("Invalid phone number");
  }

  if (
    data.designation !== undefined &&
    data.designation !== null &&
    (typeof data.designation !== "string" ||
      data.designation.length > 100)
  ) {
    errors.push("Designation cannot exceed 100 characters");
  }

  return errors;
};
