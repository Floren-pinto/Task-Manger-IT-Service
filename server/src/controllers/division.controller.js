import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/ApiResponse.js";

export const listDivisions = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from("divisions")
    .select("id, name, description, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) throw new ApiError(500, "failed to fetch divisions");

  return ok(res, data);
});
