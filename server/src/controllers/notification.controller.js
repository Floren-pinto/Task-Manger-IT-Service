import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/ApiResponse.js";
import { isUuid, parsePaginationParams } from "../utils/queryParams.js";

const NOTIFICATION_COLUMNS =
  "id, user_id, title, message, type, is_read, created_at, related_task_id";

// Express 5 mem-parse ulang req.query di setiap akses, jadi nilai boolean
// dari query string tetap berupa string "true"/"false".
function parseIsRead(value) {
  if (value === undefined || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new ApiError(400, "isRead must be true or false");
}

export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const isRead = parseIsRead(req.query.isRead);
  const { safePage, safeLimit, from, to } = parsePaginationParams(page, limit);

  let query = req.supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (typeof isRead === "boolean") {
    query = query.eq("is_read", isRead);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new ApiError(500, "Failed to fetch notifications");
  }

  const total = count ?? 0;

  return ok(res, {
    notifications: data ?? [],
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  });
});

export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const { count, error } = await req.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    throw new ApiError(500, "Failed to fetch unread notification count");
  }

  return ok(res, { unreadCount: count ?? 0 });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false)
    .select("id");

  if (error) {
    throw new ApiError(500, "Failed to update notifications");
  }

  return ok(res, { updated: data?.length ?? 0 });
});

export const updateIsReadNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    throw new ApiError(400, "Invalid notification ID");
  }

  const { data, error } = await req.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select(NOTIFICATION_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Failed to update notification");
  }

  if (!data) {
    throw new ApiError(404, "Notification not found");
  }

  return ok(res, { notification: data });
});
