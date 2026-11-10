import * as service from "../services/employeeOperationsService.js";

function handleError(res, error) {
  return res.status(error.statusCode || 500).json({
    message: error.message || "Internal server error"
  });
}

export async function createTransfer(req, res) {
  try {
    const transfer = await service.requestTransfer(req, req.body);

    return res.status(201).json({
      message: "Transfer request submitted",
      transfer
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function decideTransfer(req, res) {
  try {
    const transfer = await service.processTransfer(
      req,
      req.params.transferId,
      req.body.decision
    );

    return res.status(200).json({
      message: "Transfer request processed",
      transfer
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createVerification(req, res) {
  try {
    const verification = await service.submitVerification(req, req.body);

    return res.status(201).json({
      message: "Asset verification submitted",
      verification
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function decideVerification(req, res) {
  try {
    const verification = await service.processVerification(
      req,
      req.params.verificationId,
      req.body.decision,
      req.body.notes
    );

    return res.status(200).json({
      message: "Verification processed",
      verification
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createLicenseRequest(req, res) {
  try {
    const assignment = await service.requestSoftwareLicense(req, req.body);

    return res.status(201).json({
      message: "Software license request submitted",
      assignment
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function decideLicenseRequest(req, res) {
  try {
    const assignment = await service.processLicenseRequest(
      req,
      req.params.assignmentId,
      req.body.decision
    );

    return res.status(200).json({
      message: "Software license request processed",
      assignment
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getNotifications(req, res) {
  try {
    const result = await service.getMyNotifications(req, req.query);

    return res.status(200).json({
      total: result.count,
      notifications: result.rows
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function readNotification(req, res) {
  try {
    const notification = await service.markNotificationRead(
      req,
      req.params.notificationId
    );

    return res.status(200).json({
      message: "Notification marked as read",
      notification
    });
  } catch (error) {
    return handleError(res, error);
  }
}