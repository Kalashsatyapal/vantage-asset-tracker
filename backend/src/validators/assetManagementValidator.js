const isText = (value, min = 1, max = 180) =>
  typeof value === "string" &&
  value.trim().length >= min &&
  value.trim().length <= max;
const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function validateAssetCreate(req, res, next) {
  const {
    assetTag,
    name,
    categoryId,
    purchasePrice,
    purchaseDate
  } = req.body;

  if (
    !isText(assetTag, 2, 50) ||
    !isText(name, 2, 150) ||
    !isUuid(categoryId) ||
    !Number.isFinite(Number(purchasePrice)) ||
    Number(purchasePrice) < 0 ||
    !purchaseDate ||
    Number.isNaN(Date.parse(purchaseDate))
  ) {
    return res.status(400).json({
      message: "Valid assetTag, name, categoryId, purchasePrice and purchaseDate are required"
    });
  }

  next();
}

export function validateAssetUpdate(req, res, next) {
  const allowed = [
    "name",
    "description",
    "manufacturer",
    "modelNumber",
    "categoryId",
    "departmentId",
    "vendorId",
    "purchasePrice",
    "purchaseDate",
    "warrantyExpiry",
    "location",
    "condition"
  ];

  const keys = Object.keys(req.body);

  if (!keys.length || keys.some((key) => !allowed.includes(key))) {
    return res.status(400).json({
      message: "Provide at least one supported asset field"
    });
  }

  if (req.body.name !== undefined && !isText(req.body.name, 2, 150)) {
    return res.status(400).json({ message: "Invalid asset name" });
  }

  if (
    req.body.purchasePrice !== undefined &&
    (!Number.isFinite(Number(req.body.purchasePrice)) ||
      Number(req.body.purchasePrice) < 0)
  ) {
    return res.status(400).json({ message: "Invalid purchasePrice" });
  }

  if (
    req.body.categoryId !== undefined &&
    !isUuid(req.body.categoryId)
  ) {
    return res.status(400).json({ message: "Invalid categoryId" });
  }

  if (
    req.body.departmentId !== undefined &&
    req.body.departmentId !== null &&
    !isUuid(req.body.departmentId)
  ) {
    return res.status(400).json({ message: "Invalid departmentId" });
  }

  if (
    req.body.vendorId !== undefined &&
    req.body.vendorId !== null &&
    !isUuid(req.body.vendorId)
  ) {
    return res.status(400).json({ message: "Invalid vendorId" });
  }

  next();
}

export function validateMasterData(req, res, next) {
  const { name, code } = req.body;

  if (!isText(name, 2, 180) || !isText(code, 2, 40)) {
    return res.status(400).json({
      message: "Valid name and code are required"
    });
  }

  next();
}

export function validateMaintenanceSchedule(req, res, next) {
  const {
    assetId,
    title,
    maintenanceType,
    frequencyDays,
    nextMaintenanceAt
  } = req.body;

  const allowedTypes = [
    "PREVENTATIVE",
    "INSPECTION",
    "CALIBRATION",
    "CLEANING",
    "UPGRADE"
  ];

  if (
    !isUuid(assetId) ||
    !isText(title, 3, 180) ||
    !allowedTypes.includes(maintenanceType) ||
    !Number.isInteger(Number(frequencyDays)) ||
    Number(frequencyDays) < 1 ||
    !nextMaintenanceAt ||
    Number.isNaN(Date.parse(nextMaintenanceAt))
  ) {
    return res.status(400).json({
      message: "Invalid maintenance schedule details"
    });
  }

  next();
}

export function validateMasterDataCreate(req, res, next) {
  const { type } = req.params;
  const body = req.body;

  const valid =
    type === "categories" || type === "departments"
      ? isText(body.name, 2, 120) && isText(body.code, 2, 30)
      : type === "vendors"
        ? isText(body.vendorCode, 2, 40) &&
          isText(body.companyName, 2, 180)
        : false;

  if (!valid) {
    return res.status(400).json({
      message: "Invalid master data type or required fields"
    });
  }

  next();
}

export function validateMasterDataUpdate(req, res, next) {
  const { type } = req.params;
  const body = req.body;

  const valid =
    type === "categories" || type === "departments"
      ? Object.keys(body).length > 0 &&
        (body.name === undefined || isText(body.name, 2, 120)) &&
        (body.code === undefined || isText(body.code, 2, 30))
      : type === "vendors"
        ? Object.keys(body).length > 0 &&
          (body.vendorCode === undefined || isText(body.vendorCode, 2, 40)) &&
          (body.companyName === undefined || isText(body.companyName, 2, 180))
        : false;

  if (!valid) {
    return res.status(400).json({
      message: "Invalid master data update"
    });
  }

  next();
}
