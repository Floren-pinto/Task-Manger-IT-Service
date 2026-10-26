import { ApiError } from "../utils/ApiError.js";

export const requireSuperAdmin = (req, _res, next) => {
  if (req.profile?.role !== "SUPER_ADMIN") {
    return next(new ApiError(403, "Only SUPER_ADMIN can manage users"));
  }

  return next();
};
