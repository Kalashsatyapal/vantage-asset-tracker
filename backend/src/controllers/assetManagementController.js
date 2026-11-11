
import * as service from "../services/assetManagementService.js";

function handleError(res, error) {
  return res.status(error.statusCode || 500).json({
    message: error.message || "Internal server error"
  });
}

export async function listAssets(req, res) {
  try {
    const result = await service.listAssets(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createAsset(req, res) {
  try {
    const asset = await service.createAsset(req, req.body);
    return res.status(201).json({ message: "Asset created", asset });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateAsset(req, res) {
  try {
    const asset = await service.updateAsset(
      req,
      req.params.assetId,
      req.body
    );

    return res.status(200).json({ message: "Asset updated", asset });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function retireAsset(req, res) {
  try {
    const asset = await service.retireAsset(req, req.params.assetId);
    return res.status(200).json({ message: "Asset retired", asset });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listMasterData(req, res) {
  try {
    const records = await service.listMasterData(req.params.type);
    return res.status(200).json({ records });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createMasterData(req, res) {
  try {
    const record = await service.createMasterData(
      req,
      req.params.type,
      req.body
    );

    return res.status(201).json({ message: "Record created", record });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateMasterData(req, res) {
  try {
    const record = await service.updateMasterData(
      req,
      req.params.type,
      req.params.id,
      req.body
    );

    return res.status(200).json({ message: "Record updated", record });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function deactivateMasterData(req, res) {
  try {
    const record = await service.deactivateMasterData(
      req,
      req.params.type,
      req.params.id
    );

    return res.status(200).json({ message: "Record deactivated", record });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createMaintenanceSchedule(req, res) {
  try {
    const schedule = await service.createMaintenanceSchedule(req, req.body);
    return res.status(201).json({
      message: "Maintenance schedule created",
      schedule
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listMaintenanceSchedules(req, res) {
  try {
    const result = await service.listMaintenanceSchedules(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateMaintenanceSchedule(req, res) {
  try {
    const schedule = await service.updateMaintenanceSchedule(
      req,
      req.params.scheduleId,
      req.body
    );

    return res.status(200).json({
      message: "Maintenance schedule updated",
      schedule
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getDashboard(req, res) {
  try {
    const dashboard = await service.getAssetManagementDashboard();
    return res.status(200).json({ dashboard });
  } catch (error) {
    return handleError(res, error);
  }
}
