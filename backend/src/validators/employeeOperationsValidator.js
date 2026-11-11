
const validText = (value, min = 1, max = 1000) =>
  typeof value === "string" &&
  value.trim().length >= min &&
  value.trim().length <= max;

export function validateTransferRequest(req, res, next) {
  const { assetId, toDepartmentId, requestReason } = req.body;

  if (
    !assetId ||
    !toDepartmentId ||
    !validText(requestReason, 5, 1000)
  ) {
    return res.status(400).json({
      message: "assetId, toDepartmentId and requestReason are required"
    });
  }

  next();
}

export function validateVerification(req, res, next) {
  const { assetId, verificationPeriod, reportedCondition, employeeRemarks } =
    req.body;

  const allowed = ["NEW", "GOOD", "FAIR", "DAMAGED", "MISSING"];

  if (
    !assetId ||
    !validText(verificationPeriod, 1, 20) ||
    !allowed.includes(reportedCondition)
  ) {
    return res.status(400).json({
      message:
        "assetId, verificationPeriod and a valid reportedCondition are required"
    });
  }

  if (
    employeeRemarks !== undefined &&
    !validText(employeeRemarks, 0, 1000)
  ) {
    return res.status(400).json({
      message: "employeeRemarks must not exceed 1000 characters"
    });
  }

  next();
}

export function validateLicenseAssignment(req, res, next) {
  const { licenseId, employeeId } = req.body;

  if (!licenseId || !employeeId) {
    return res.status(400).json({
      message: "licenseId and employeeId are required"
    });
  }

  next();
}
