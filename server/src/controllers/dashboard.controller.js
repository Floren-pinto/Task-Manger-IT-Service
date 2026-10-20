import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/ApiResponse.js";

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase.rpc("get_dashboard_summary");

  if (error) {
    console.error("Dashboard summary RPC failed:", error);
    throw new ApiError(500, "Failed to fetch dashboard summary");
  }

  return ok(res, data);
});
