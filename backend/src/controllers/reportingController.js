
import * as service from "../services/reportingService.js";

function handleError(res, error) {
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : "Internal server error"
  });
}

function sendCsv(res, filename, content) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  return res.status(200).send(`\uFEFF${content}`);
}

export async function exportAssets(req, res) {
  try {
    const csv = await service.exportAssets();
    return sendCsv(res, "vantage-assets.csv", csv);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function exportAllocations(req, res) {
  try {
    const csv = await service.exportAllocations();
    return sendCsv(res, "vantage-allocations.csv", csv);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function exportAuditLogs(req, res) {
  try {
    const csv = await service.exportAuditLogs(req.query);
    return sendCsv(res, "vantage-audit-logs.csv", csv);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getOverdueAllocations(req, res) {
  try {
    const result = await service.listOverdueAllocations(req.query);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function processOverdueAllocations(req, res) {
  try {
    const result = await service.processOverdueAllocations(req);
    return res.status(200).json({
      success: true,
      message: "Overdue allocation processing completed",
      ...result
    });
  } catch (error) {
    return handleError(res, error);
  }
}
