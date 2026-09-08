import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    console.log("req.user", req.user);
    const { data, error } = await req.supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ApiError(404, "User profile not found", error.message);
      }

      throw new ApiError(500, "Failed to load user data", error.message);
    }

    return ok(res, { user: data });
  }),
);

export default router;
