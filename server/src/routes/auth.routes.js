import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    return ok(res, req.profile, "Authenticated");
  }),
);

export default router;
