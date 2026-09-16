import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/ApiResponse.js";
import { type } from "os";

export const listNotifications = asyncHandler(async (req, res) => {
  const { isRead, page = 1, limit = 20 } = req.query;

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = req.supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (isRead) {
    query = query.eq("is_read", isRead);
  }

  const { data, count, error } = await query;

  if (error) throw new ApiError(500, "Failed to fetch notifications");

  return ok(res, {
    notifications: data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
    },
  });
});

export const updateIsReadNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const { data, error } = await req.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .single();

  if (error) throw new ApiError(500, "Failed to update notification");

  return ok(res, { notification: data });
});
