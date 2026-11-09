
import env from "../../../config/env.js";

export const verifyClientOrigin = (req, res, next) => {
  const origin = req.get("origin");

  if (!origin || origin !== env.CLIENT_URL) {
    return res.status(403).json({
      success: false,
      message: "Untrusted request origin",
      requestId: req.requestId
    });
  }

  next();
};
