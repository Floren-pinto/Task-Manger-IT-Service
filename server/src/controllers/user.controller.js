import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { testConnection } from "../utils/internetCheck.js";

export const listUsers = asyncHandler(async (req, res) => {
  const { division, role, status } = req.query;

  if (!testConnection()) throw new ApiError(500, "the internet is offline");

  let query = req.supabase
    .from("users")
    .select(
      "id, name, email, role, is_active, division_id, deleted_at, created_at, updated_at",
    )
    .order("name", { ascending: true });

  if (division) query = query.eq("division_id", division);
  if (role) query = query.eq("role", role);
  if (status) query = query.eq("is_active", status);
  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch users:", error.message);
    throw new ApiError(500, "failed to fetch users");
  }

  return ok(res, data);
});
