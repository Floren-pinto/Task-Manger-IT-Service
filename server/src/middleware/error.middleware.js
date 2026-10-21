import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500 || err.details) {
      console.error(`${req.method} ${req.originalUrl}`, err);
    }

    const payload = { success: false, message: err.message };

    if (env.nodeEnv !== "production" && err.details) {
      payload.error = err.details;
    }

    return res.status(err.statusCode).json(payload);
  }

  console.error(`${req.method} ${req.originalUrl}`, err); // TODO: ganti logger proper (pino) sebelum production
  return res
    .status(500)
    .json({ success: false, message: "Internal server error" });
};

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({ success: false, message: "Not Found" });
};
