import {
  ASSET_CONDITION,
  MAINTENANCE_PRIORITY
} from "../constants/assetLifecycleConstants.js";

const isValidText = (value, min = 2, max = 500) =>
  typeof value === "string" &&
  value.trim().length >= min &&
  value.trim().length <= max;

export function validateAllocation(req, res, next) {
  const { employeeId, assetId } = req.body;

  if (!employeeId || !assetId) {
    return res.status(400).json({
      message: "employeeId and assetId are required"
    });
  }

  next();
}

export function validateReturnRequest(req, res, next) {
  const { condition, notes } = req.body;

  if (!Object.values(ASSET_CONDITION).includes(condition)) {
    return res.status(400).json({
      message: "Invalid asset condition"
    });
  }

  if (notes !== undefined && !isValidText(notes, 0, 1000)) {
    return res.status(400).json({
      message: "Notes must not exceed 1000 characters"
    });
  }

  next();
}

export function validateMaintenanceTicket(req, res, next) {
  const { title, description, priority } = req.body;

  if (!req.params.assetId ||
      !isValidText(title, 3, 150) ||
      !isValidText(description, 5, 2000)) {
    return res.status(400).json({
      message: "Valid assetId, title and description are required"
    });
  }

  if (
    priority &&
    !Object.values(MAINTENANCE_PRIORITY).includes(priority)
  ) {
    return res.status(400).json({
      message: "Invalid maintenance priority"
    });
  }

  next();
}