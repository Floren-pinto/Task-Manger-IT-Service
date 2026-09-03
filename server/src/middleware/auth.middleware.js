import { supabaseAnon, createUserClient } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// auth middleware
export const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    throw new ApiError(401, "Missing or invalid authorization token");
  }

  // verify token
  const { data, error } = await supabaseAnon.auth.getUser(token);

  if (error || !data.user)
    throw new ApiError(401, "Invalid token or expired token");

  req.user = data.user;
  req.token = token;
  req.supabase = createUserClient(token);

  next();
});
