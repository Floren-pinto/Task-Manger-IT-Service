import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/ApiResponse.js";

// GET TASK
export const listTasks = asyncHandler(async (req, res) => {
  const { status, priority, page = 1, limit = 20 } = req.query;

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = req.supabase
    .from("tasks")
    .select(
      `id, title, description, priority, status, due_date, created_at, updated_at, client:clients(id, name), division:divisions(id, name)`,
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
  if (error) throw new ApiError(500, "Failed to fetch tasks");

  return ok(res, {
    tasks: data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
    },
  });
});

import crypto from "node:crypto";
import { created } from "../utils/ApiResponse.js";

// CREATE TASK
export const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    priority,
    dueDate,
    divisionId,
    clientId,
    assetId,
  } = req.body;

  if (!title || !description || !divisionId || !clientId) {
    throw new ApiError(
      400,
      "title, description, divisionId, and clientId are required",
    );
  }

  if (req.profile.role === "TECHNICIAN") {
    throw new ApiError(403, "Technicians are not allowed to create tasks");
  }

  const { data, error } = await req.supabase
    .from("tasks")
    .insert({
      id: crypto.randomUUID(),
      title,
      description,
      priority,
      due_date: dueDate ?? null,
      division_id: divisionId,
      client_id: clientId,
      asset_id: assetId ?? null,
      created_by_id: req.user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new ApiError(
        400,
        "Invalid divisionId, clientId, or assetId",
        error.message,
      );
    }
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid priority value");
    }
    throw new ApiError(500, "Failed to create task");
  }

  return created(res, data, "Task created");
});

// ASSIGN TASK
export const assignTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { userId } = req.body;

  if (!userId) throw new ApiError(400, "User Id is required");

  if (req.profile.role === "TECHNICIAN")
    throw new ApiError(403, "Technicians are not allowed to assign tasks");

  const { data: task, error: taskError } = await req.supabase
    .from("tasks")
    .select("id, division_id, deleted_at")
    .eq("id", taskId)
    .single();

  if (taskError || !task)
    throw new ApiError(404, "Task not found or accessible");
  if (task.deleted_at) throw new ApiError(400, "cannot assign a deleted task");

  const { data: assignee, error: assigneeError } = await req.supabase
    .from("users")
    .select("id, role, division_id, is_active, deleted_at")
    .eq("id", userId)
    .single();

  if (assigneeError || !assignee)
    throw new ApiError(404, "User not found or not accessible");
  if (assignee.role !== "TECHNICIAN")
    throw new ApiError(400, "assignee must be a technician");
  if (assignee.division_id !== task.division_id)
    throw new ApiError(
      400,
      "assignee must belong to the same division as the task",
    );
  if (!assignee.is_active || assignee.deleted_at)
    throw new ApiError(400, "assignee is not active");

  const { data, error } = await req.supabase
    .from("task_assignments")
    .insert({
      id: crypto.randomUUID(),
      task_id: taskId,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ApiError(409, "This user is already assigned to this task");
    }
    if (error.code === "23503") {
      throw new ApiError(400, "Invalid taskId or userId", error.message);
    }
    throw new ApiError(500, "Failed to assign task");
  }
  return created(res, data, "Task assigned");
});

// Update Task Status
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { newStatus } = req.body;

  if (!newStatus) throw new ApiError(400, "New status is required");

  if (req.profile.role === "STAFF") {
    throw new ApiError(403, "Staff are not allowed to update task status");
  }

  const { error: rpcError } = await req.supabase.rpc("update_task_status", {
    p_task_id: taskId,
    p_new_status: newStatus,
  });

  if (rpcError) {
    if (rpcError.message?.includes("TASK_NOT_FOUND")) {
      throw new ApiError(404, "Task not found or accessible");
    }
    if (rpcError.message?.includes("SAME_STATUS")) {
      throw new ApiError(400, "New status is the same as the current status");
    }
    if (rpcError.code === "22P02") {
      throw new ApiError(400, `invalid status value ${newStatus}`);
    }
    if (rpcError.message?.includes("only update")) {
      throw new ApiError(403, "You are not allowed to change task status");
    }
    throw new ApiError(500, "Failed to update task status");
  }

  const { data, error } = await req.supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error || !data)
    throw new ApiError(500, "Status updated but failed to fetch latest data");

  return ok(res, data, "Task status updated");
});
