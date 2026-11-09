
import { AssetAuditLog } from "../models/index.js";
import logger from "../../../config/logger.js";

export const recordAudit = async ({
  actorId = null,
  action,
  entityType,
  entityId = null,
  previousValues = null,
  newValues = null,
  requestId = null,
  ipAddress = null,
  userAgent = null,
  metadata = null,
  transaction = null
}) => {
  try {
    return await AssetAuditLog.create(
      {
        actorId,
        action,
        entityType,
        entityId,
        previousValues,
        newValues,
        requestId,
        ipAddress,
        userAgent,
        metadata
      },
      { transaction }
    );
  } catch (error) {
    logger.error("AUDIT_RECORD_CREATION_FAILED", {
      action,
      entityType,
      entityId,
      message: error.message
    });

    throw error;
  }
};
