const validText = (value, min = 2, max = 1000) =>
  typeof value === "string" &&
  value.trim().length >= min &&
  value.trim().length <= max;

export function validateTransferRequest(req, res, next) {
  const { assetId, targetEmployeeId, reason } = req.body;

  if (!assetId || !targetEmployeeId || !validText(reason, 5, 1000)) {
    return res.status(400).json({
      message: "assetId, targetEmployeeId and a valid reason are required"
    });
  }

  if (targetEmployeeId === req.user.id) {
    return res.status(400).json({
      message: "You cannot transfer an asset to yourself"
    });
  }

  next();
}

export function validateVerification(req, res, next) {
  const { condition, notes } = req.body;
  const allowedConditions = ["GOOD", "DAMAGED", "CRITICAL"];

  if (!allowedConditions.includes(condition)) {
    return res.status(400).json({
      message: "Invalid verification condition"
    });
  }

  if (notes !== undefined && !validText(notes, 0, 1000)) {
    return res.status(400).json({
      message: "Notes must not exceed 1000 characters"
    });
  }

  next();
}

export function validateLicenseRequest(req, res, next) {
  const { softwareLicenseId, reason } = req.body;

  if (!softwareLicenseId || !validText(reason, 5, 1000)) {
    return res.status(400).json({
      message: "softwareLicenseId and a valid reason are required"
    });
  }

  next();
}