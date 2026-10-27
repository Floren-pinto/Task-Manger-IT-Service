import crypto from "node:crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { created, ok } from "../utils/ApiResponse.js";
import {
  ATTACHMENT_BUCKET,
  attachSignedAttachmentUrls,
} from "../utils/attachmentUrl.js";

function normalizeDateBound(value, endOfDay = false) {
  if (!value) return value;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
    return `${value}T${time}Z`;
  }

  return value;
}

function sanitizeSearch(value) {
  return String(value)
    .trim()
    .replace(/^#/, "")
    .replace(/[,()%"]/g, " ")
    .trim();
}

export const listTasks = asyncHandler(async (req, res) => {
  const {
    status,
    priority,
    page = 1,
    limit = 20,
    search,
    divisionId,
    clientId,
    technicianId,
    dueFrom,
    dueTo,
    sortBy,
    sortOrder,
    includeDeleted,
  } = req.query;

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  const sortColumn = sortBy === "due_date" ? "due_date" : "created_at";
  const ascending = String(sortOrder).toLowerCase() === "asc";

  let query = req.supabase
    .from("tasks")
    .select(
      `id, title, description, priority, status, due_date, created_at, updated_at, client:clients(id, name), division:divisions(id, name), assignments:task_assignments(user:users(id, name))`,
      { count: "exact" },
    )
    .order(sortColumn, { ascending })
    .range(from, to);

  if (includeDeleted !== true) {
    query = query.is("deleted_at", null);
  }
  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (divisionId) query = query.eq("division_id", divisionId);
  if (clientId) query = query.eq("client_id", clientId);

  if (dueFrom) {
    query = query.gte("due_date", normalizeDateBound(dueFrom));
  }
  if (dueTo) {
    query = query.lte("due_date", normalizeDateBound(dueTo, true));
  }

  const keyword = search ? sanitizeSearch(search) : "";
  if (keyword) {
    query = query.or(`title.ilike.%${keyword}%,id.ilike.%${keyword}%`);
  }

  if (technicianId) {
    const { data: assignments, error: assignmentError } = await req.supabase
      .from("task_assignments")
      .select("task_id")
      .eq("user_id", technicianId);

    if (assignmentError) {
      throw new ApiError(500, "Failed to filter tasks by technician");
    }

    const taskIds = [
      ...new Set((assignments ?? []).map((assignment) => assignment.task_id)),
    ];

    if (taskIds.length === 0) {
      return ok(res, {
        tasks: [],
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    query = query.in("id", taskIds);
  }

  const { data, count, error } = await query;
  if (error) {
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid filter value");
    }
    if (error.code === "22007" || error.code === "22008") {
      throw new ApiError(400, "Invalid date filter");
    }
    throw new ApiError(500, "Failed to fetch tasks");
  }

  const total = count ?? 0;

  return ok(res, {
    tasks: data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  });
});

export const getTaskDetail = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  if (!taskId) {
    throw new ApiError(400, "Task ID is required");
  }

  const { data, error } = await req.supabase
    .from("tasks")
    .select(
      `id, title, description, priority, status, due_date, completed_at, created_at, updated_at, deleted_at,
        createdBy:users!tasks_created_by_id_fkey (id, name, email),
        division:divisions!tasks_division_id_fkey (id, name),
        client:clients!tasks_client_id_fkey (id, name, contact, email, address, service_type),
        asset:assets!tasks_asset_id_fkey (id, name, serial_number, type),
        assignments:task_assignments (
          id,
          assigned_at,
          user:users!task_assignments_user_id_fkey (id, name, email)
        ),
        attachments:task_attachments (
          id, file_url, file_name, file_type, uploaded_at,
          uploadedBy:users!task_attachments_uploaded_by_id_fkey (id, name, email)
        ),
        histories:task_status_history (
          id, old_status, new_status, changed_at,
          user:users!task_status_history_user_id_fkey (id, name, email)
        ),
        reports:service_reports (
          id, summary, action_taken, notes, created_at, updated_at,
          createdBy:users!service_reports_created_by_id_fkey (id, name, email)
        )`,
    )
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Failed to fetch task detail");
  }
  if (!data) throw new ApiError(404, "Task not found or accessible");

  const task = { ...data };
  if (Array.isArray(task.attachments)) {
    task.attachments = await attachSignedAttachmentUrls(
      req.supabase,
      task.attachments,
    );
  }

  return ok(res, task);
});

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
      console.error("Create task invalid reference:", error.message);
      throw new ApiError(400, "Invalid divisionId, clientId, or assetId");
    }
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid priority value");
    }
    throw new ApiError(500, "Failed to create task");
  }

  return created(res, data, "Task created");
});

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
      console.error("Assign task invalid reference:", error.message);
      throw new ApiError(400, "Invalid taskId or userId");
    }
    throw new ApiError(500, "Failed to assign task");
  }
  return created(res, data, "Task assigned");
});

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

export const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const {
    title,
    description,
    priority,
    dueDate,
    divisionId,
    clientId,
    assetId,
    deleted,
    status,
  } = req.body;

  if (!taskId) throw new ApiError(400, "Task ID is required");

  if (status !== undefined) {
    throw new ApiError(
      400,
      "Use PATCH /api/tasks/:taskId/status to update task status",
    );
  }

  if (deleted !== undefined && typeof deleted !== "boolean") {
    throw new ApiError(400, "deleted must be a boolean");
  }

  const updatePayload = {};

  if (title !== undefined) updatePayload.title = title;
  if (description !== undefined) updatePayload.description = description;
  if (priority !== undefined) updatePayload.priority = priority;
  if (dueDate !== undefined) updatePayload.due_date = dueDate ?? null;
  if (divisionId !== undefined) updatePayload.division_id = divisionId;
  if (clientId !== undefined) updatePayload.client_id = clientId;
  if (assetId !== undefined) updatePayload.asset_id = assetId ?? null;

  if (deleted !== undefined) {
    updatePayload.deleted_at = deleted ? new Date() : null;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const { data, error } = await req.supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError(404, "Task not found or accessible");
    }
    if (error.code === "P0001") {
      console.error("Task update rejected by database trigger:", error.message);
      throw new ApiError(403, "You are not allowed to update this field");
    }
    if (error.code === "42501") {
      throw new ApiError(403, "You are not allowed to update this task");
    }
    if (error.code === "23503") {
      console.error("Update task invalid reference:", error.message);
      throw new ApiError(400, "Invalid divisionId, clientId, or assetId");
    }
    if (error.code === "23502") {
      console.error("Update task missing required field:", error.message);
      throw new ApiError(400, "Required field cannot be null");
    }
    if (error.code === "22007" || error.code === "22008") {
      throw new ApiError(400, "Invalid dueDate value");
    }
    if (error.code === "22P02") {
      throw new ApiError(400, "Invalid priority value");
    }
    throw new ApiError(500, "Failed to update task");
  }

  return ok(
    res,
    data,
    deleted === true ? "Task deleted successfully" : "Task updated successfully",
  );
});

export const createTaskAttachment = asyncHandler(async (req, res) => {
  const { filePath, fileName, fileType } = req.body;
  const { taskId } = req.params;
  const { id: userId } = req.profile;

  if (!fileName || !fileType || !filePath)
    throw new ApiError(400, "filePath, fileName and fileType are required");

  const fileFolder = filePath.split("/")[0];
  const removeFile = async () => {
    try {
      await req.supabase.storage.from(ATTACHMENT_BUCKET).remove([filePath]);
    } catch (err) {
      console.error(`Failed clean orphan file [${filePath}]`, err.message);
    }
  };

  if (fileFolder !== String(taskId)) {
    await removeFile();
    throw new ApiError(400, "filePath does not match");
  }

  const { data, error } = await req.supabase
    .from("task_attachments")
    .insert({
      id: crypto.randomUUID(),
      task_id: taskId,
      file_url: filePath,
      file_name: fileName,
      file_type: fileType,
      uploaded_by_id: userId,
    })
    .select()
    .single();

  if (error) {
    await removeFile();
    if (error.code === "23503") throw new ApiError(400, "Invalid taskId");
    if (error.code === "42501")
      throw new ApiError(
        403,
        "You are not allowed to upload attachments to this task",
      );
    throw new ApiError(500, "Failed to create task attachment");
  }

  const [attachment] = await attachSignedAttachmentUrls(req.supabase, [data]);

  return created(res, attachment, "Task attachment created");
});

export const listTaskAttachments = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  if (!taskId) {
    throw new ApiError(400, "Task ID is required");
  }

  const { data, error } = await req.supabase
    .from("task_attachments")
    .select(
      `id, file_url, file_name, file_type, uploaded_at,
       uploadedBy:users!task_attachments_uploaded_by_id_fkey (id, name, email)`,
    )
    .eq("task_id", taskId)
    .order("uploaded_at", { ascending: false });

  if (error) throw new ApiError(500, "Failed to fetch task attachments");

  const attachments = await attachSignedAttachmentUrls(
    req.supabase,
    data ?? [],
  );

  return ok(res, attachments);
});

export const deleteTaskAttachment = asyncHandler(async (req, res) => {
  const { taskId, attachmentId } = req.params;

  if (!taskId || !attachmentId) {
    throw new ApiError(400, "Task ID and attachment ID are required");
  }

  const { data: attachment, error: fetchError } = await req.supabase
    .from("task_attachments")
    .select("id, task_id, file_url")
    .eq("id", attachmentId)
    .eq("task_id", taskId)
    .maybeSingle();

  if (fetchError) throw new ApiError(500, "Failed to fetch task attachment");
  if (!attachment) throw new ApiError(404, "Task attachment not found");

  const { data, error } = await req.supabase
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("task_id", taskId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116")
      throw new ApiError(404, "Task attachment not found");
    if (error.code === "42501")
      throw new ApiError(
        403,
        "You are not allowed to delete attachments from this task",
      );
    throw new ApiError(500, "Failed to delete task attachment");
  }

  try {
    await req.supabase.storage
      .from(ATTACHMENT_BUCKET)
      .remove([attachment.file_url]);
  } catch (err) {
    console.error(
      `Failed to remove file [${attachment.file_url}]`,
      err.message,
    );
  }

  return ok(res, null, "Task attachment deleted");
});
