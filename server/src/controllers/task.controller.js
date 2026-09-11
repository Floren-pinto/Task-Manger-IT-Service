import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/ApiResponse.js";

export const listTasks = asyncHandler(async (req, res) => {
  const { status, priority, page = 1, limit = 20 } = req.query;

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = req.supabase
    .from("tasks")
    .select(
      `id, title, description, priority, status, due_date, created_at, client:clients(id, name), division:divisions(id, name)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  }
  if (priority) {
    query = query.eq("priority", priority);
  }
  const { data, count, error } = await query;
  if (error) throw new ApiError(500, "Failed to fetch tasks", error.message);

  return ok(res, {
    tasks: data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
    },
  });
});
