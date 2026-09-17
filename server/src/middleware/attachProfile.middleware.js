import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const attachProfile = asyncHandler(async (req, res, next) => {
  const { data, error } = await req.supabase
    .from("users")
    .select("id, name, email, role, division_id, is_active ")
    .eq("id", req.user.id)
    .single();

  if (error || !data) {
    throw new ApiError(404, "profile not found or inaccesible");
  }

  if (!data.is_active || data.deleted_at) {
    throw new ApiError(403, "Account is inactive");
  }

  req.profile = data;
  next();
});
