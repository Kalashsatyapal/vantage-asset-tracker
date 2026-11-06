
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: "Requested resource was not found",
    requestId: req.requestId
  });
};
