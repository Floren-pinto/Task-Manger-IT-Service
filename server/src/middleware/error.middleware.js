import { ApiError } from "../utils/ApiError.js";

export const errorHandler = (err, req, res, next) => {
  //  Stack Trace
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json({ success: false, message: err.message, error: err.details });
  }
  console.error(err); // TODO: ganti logger proper (pino) sebelum production
  return res
    .status(500)
    .json({ success: false, message: "Internal server error" });
};

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({ success: false, message: "Not Found" });
};
