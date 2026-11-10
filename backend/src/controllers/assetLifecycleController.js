import * as lifecycleService from "../services/assetLifecycleService.js";

function handleError(res, error) {
  return res.status(error.statusCode || 500).json({
    message: error.message || "Internal server error"
  });
}

export async function getAvailableAssets(req, res) {
  try {
    const result = await lifecycleService.listAvailableAssets(req.query);

    return res.status(200).json({
      total: result.count,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      assets: result.rows
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getAsset(req, res) {
  try {
    const asset = await lifecycleService.getAssetDetails(req.params.id);

    return res.status(200).json({ asset });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function allocateAsset(req, res) {
  try {
    const allocation = await lifecycleService.allocateAsset({
      req,
      employeeId: req.body.employeeId,
      assetId: req.body.assetId
    });

    return res.status(201).json({
      message: "Asset allocated successfully",
      allocation
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function requestReturn(req, res) {
  try {
    const assetReturn = await lifecycleService.requestAssetReturn({
      req,
      allocationId: req.params.allocationId,
      condition: req.body.condition,
      notes: req.body.notes
    });

    return res.status(201).json({
      message: "Return request submitted",
      assetReturn
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function inspectReturn(req, res) {
  try {
    const assetReturn = await lifecycleService.inspectAssetReturn({
      req,
      returnId: req.params.returnId,
      decision: req.body.decision,
      condition: req.body.condition,
      notes: req.body.notes
    });

    return res.status(200).json({
      message: "Return request processed",
      assetReturn
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function reportDamage(req, res) {
  try {
    const ticket = await lifecycleService.reportAssetDamage({
      req,
      assetId: req.params.assetId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority
    });

    return res.status(201).json({
      message: "Damage report submitted",
      ticket
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getMyAssetHistory(req, res) {
  try {
    const history = await lifecycleService.getEmployeeAssetHistory(
      req.user.id
    );

    return res.status(200).json({ history });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getMyAssetSummary(req, res) {
  try {
    const summary = await lifecycleService.getEmployeeAssetSummary(
      req.user.id
    );

    return res.status(200).json({ summary });
  } catch (error) {
    return handleError(res, error);
  }
}
export async function updateMaintenance(req, res) {
  try {
    const ticket = await lifecycleService.updateMaintenanceTicket({
      req,
      ticketId: req.params.ticketId,
      assignedTo: req.body.assignedTo,
      status: req.body.status,
      priority: req.body.priority
    });

    return res.status(200).json({
      message: "Maintenance ticket updated",
      ticket
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getMaintenanceTickets(req, res) {
  try {
    const result = await lifecycleService.listMaintenanceTickets(req.query);

    return res.status(200).json({
      total: result.count,
      tickets: result.rows
    });
  } catch (error) {
    return handleError(res, error);
  }
}