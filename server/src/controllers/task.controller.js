import crypto from "node:crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { created, ok } from "../utils/ApiResponse.js";
import {
  ATTACHMENT_BUCKET,
  attachSignedAttachmentUrls,
  isValidAttachmentPath,
} from "../utils/attachmentUrl.js";
import {
  isDateOnly,
  localDayEndUtc,
  localDayStartUtc,
} from "../utils/dateTime.js";
import {
  isUuid,
  parsePaginationParams,
  sanitizeSearch,
} from "../utils/queryParams.js";
import {
  parseOptionalBoolean,
  parseRequiredText,
} from "../utils/validation.js";

// Kolom baris task yang dikembalikan create/update/status (tanpa relasi).
const TASK_ROW_COLUMNS =
  "id, title, description, priority, status, due_date, completed_at, division_id, client_id, asset_id, created_by_id, created_at, updated_at, deleted_at";

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 5000;
const PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// Embed kedua khusus filter teknisi; `!inner` membuang task tanpa assignment
// teknisi itu tanpa memotong daftar `assignments` yang ditampilkan.
const TECHNICIAN_FILTER_EMBED =
  "technician_filter:task_assignments!inner(user_id)";

function parsePriority(value) {
  if (!PRIORITIES.has(value)) {
    throw new ApiError(400, "priority must be one of LOW, MEDIUM, HIGH, URGENT");
  }
  return value;
}

function parseUuidField(value, field) {
  if (!isUuid(value)) throw new ApiError(400, `Invalid ${field}`);
  return value;
}

function parseDueDate(value) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ApiError(400, "dueDate must be a date string or null");
  }
  return value;
}

// "YYYY-MM-DD" dibaca sebagai hari WIB; nilai lain diteruskan apa adanya
// (format tidak valid ditolak database dengan 22007 -> 400).
function normalizeDateBound(value, endOfDay = false) {
  if (!isDateOnly(value)) return value;
  const bound = endOfDay ? localDayEndUtc(value) : localDayStartUtc(value);
  return bound ?? value;
}

// Asset task wajib milik client task tersebut, agar riwayat servis & laporan
// tidak menampilkan pasangan client–asset yang salah.
async function assertAssetBelongsToClient(
  supabase,
  assetId,
  clientId,
  { allowArchived = false } = {},
) {
  const { data: asset, error } = await supabase
    .from("assets")
    .select("id, client_id, deleted_at")
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    if (error.code === "22P02") throw new ApiError(400, "Invalid assetId");
    throw new ApiError(500, "Failed to validate asset");
  }
  if (!asset) throw new ApiError(400, "Invalid assetId");
  if (asset.client_id !== clientId) {
    throw new ApiError(400, "Asset does not belong to the selected client");
  }
  if (asset.deleted_at && !allowArchived) {
    throw new ApiError(400, "Asset is archived");
  }
}

// Untuk update parsial: gabungkan nilai baru dengan nilai task saat ini.
async function assertTaskAssetMatchesClient(supabase, taskId, clientId, assetId) {
  const { data: current, error } = await supabase
    .from("tasks")
    .select("client_id, asset_id")
    .eq("id", taskId)
    .maybeSingle();

  if (error) throw new ApiError(500, "Failed to fetch task");
  if (!current) throw new ApiError(404, "Task not found or accessible");

  const nextClientId = clientId === undefined ? current.client_id : clientId;
  const nextAssetId = assetId === undefined ? current.asset_id : assetId;
  if (!nextAssetId) return;

  // Asset lama yang kemudian diarsip tetap boleh dipertahankan.
  await assertAssetBelongsToClient(supabase, nextAssetId, nextClientId, {
    allowArchived: nextAssetId === current.asset_id,
  });
}

const TASK_LIST_COLUMNS = `id, title, description, priority, status, due_date, created_at, updated_at, client:clients(id, name), division:divisions(id, name), assignments:task_assignments(user:users(id, name))`;

export const listTasks = asyncHandler(async (req, res) => {
  const {
    status,
    priority,
    page,
    limit,
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

  const { safePage, safeLimit, from, to } = parsePaginationParams(page, limit);
  const sortColumn = sortBy === "due_date" ? "due_date" : "created_at";
  const ascending = String(sortOrder).toLowerCase() === "asc";

  if (technicianId && !isUuid(String(technicianId))) {
    throw new ApiError(400, "Invalid technicianId");
  }

  const columns = technicianId
    ? `${TASK_LIST_COLUMNS}, ${TECHNICIAN_FILTER_EMBED}`
    : TASK_LIST_COLUMNS;

  let query = req.supabase
    .from("tasks")
    .select(columns, { count: "exact" })
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

  const keyword = search ? sanitizeSearch(search, { stripHash: true }) : "";
  if (keyword) {
    query = query.or(`title.ilike.%${keyword}%,id.ilike.%${keyword}%`);
  }

  if (technicianId) {
    query = query.eq("technician_filter.user_id", technicianId);
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
  // Embed filter hanya untuk query; tidak ikut dikirim ke client.
  const tasks = (data ?? []).map(
    ({ technician_filter: _technicianFilter, ...task }) => task,
  );

  return ok(res, {
    tasks,
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
  } = req.body ?? {};

  if (req.profile.role === "TECHNICIAN") {
    throw new ApiError(403, "Technicians are not allowed to create tasks");
  }

  if (!divisionId || !clientId) {
    throw new ApiError(400, "divisionId and clientId are required");
  }

  const payload = {
    id: crypto.randomUUID(),
    title: parseRequiredText(title, "title", TITLE_MAX_LENGTH),
    description: parseRequiredText(
      description,
      "description",
      DESCRIPTION_MAX_LENGTH,
    ),
    // undefined dibiarkan agar default database (MEDIUM) yang dipakai.
    priority: priority === undefined ? undefined : parsePriority(priority),
    due_date: dueDate === undefined ? null : parseDueDate(dueDate),
    division_id: parseUuidField(divisionId, "divisionId"),
    client_id: parseUuidField(clientId, "clientId"),
    asset_id: assetId ? parseUuidField(assetId, "assetId") : null,
    created_by_id: req.user.id,
  };

  if (payload.asset_id) {
    await assertAssetBelongsToClient(
      req.supabase,
      payload.asset_id,
      payload.client_id,
    );
  }

  const { data, error } = await req.supabase
    .from("tasks")
    .insert(payload)
    .select(TASK_ROW_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23503") {
      console.error("Create task invalid reference:", error.message);
      throw new ApiError(400, "Invalid divisionId, clientId, or assetId");
    }
    if (error.code === "22007" || error.code === "22008") {
      throw new ApiError(400, "Invalid dueDate value");
    }
    if (error.code === "42501") {
      throw new ApiError(403, "You are not allowed to create a task");
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
    .select("id, task_id, user_id, assigned_at")
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

  // Kode error di-raise oleh update_task_status (03_task_status_functions.sql).
  if (rpcError) {
    if (rpcError.code === "P0002") {
      throw new ApiError(404, "Task not found or accessible");
    }
    if (rpcError.code === "22023") {
      throw new ApiError(400, "New status is the same as the current status");
    }
    if (rpcError.code === "22P02") {
      throw new ApiError(400, `invalid status value ${newStatus}`);
    }
    if (rpcError.code === "42501") {
      throw new ApiError(403, "You are not allowed to change task status");
    }
    console.error("update_task_status failed:", rpcError.message);
    throw new ApiError(500, "Failed to update task status");
  }

  const { data, error } = await req.supabase
    .from("tasks")
    .select(TASK_ROW_COLUMNS)
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
  } = req.body ?? {};

  if (!taskId) throw new ApiError(400, "Task ID is required");

  if (status !== undefined) {
    throw new ApiError(
      400,
      "Use PATCH /api/tasks/:taskId/status to update task status",
    );
  }

  parseOptionalBoolean(deleted, "deleted");

  const updatePayload = {};

  if (title !== undefined) {
    updatePayload.title = parseRequiredText(title, "title", TITLE_MAX_LENGTH);
  }
  if (description !== undefined) {
    updatePayload.description = parseRequiredText(
      description,
      "description",
      DESCRIPTION_MAX_LENGTH,
    );
  }
  if (priority !== undefined) updatePayload.priority = parsePriority(priority);
  if (dueDate !== undefined) updatePayload.due_date = parseDueDate(dueDate);
  if (divisionId !== undefined) {
    updatePayload.division_id = parseUuidField(divisionId, "divisionId");
  }
  if (clientId !== undefined) {
    updatePayload.client_id = parseUuidField(clientId, "clientId");
  }
  if (assetId !== undefined) {
    updatePayload.asset_id = assetId ? parseUuidField(assetId, "assetId") : null;
  }

  if (deleted !== undefined) {
    updatePayload.deleted_at = deleted ? new Date() : null;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(400, "At least one field is required to update");
  }

  if (clientId !== undefined || assetId !== undefined) {
    await assertTaskAssetMatchesClient(
      req.supabase,
      taskId,
      updatePayload.client_id,
      updatePayload.asset_id,
    );
  }

  const { data, error } = await req.supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .select(TASK_ROW_COLUMNS)
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
      throw new ApiError(400, "Invalid field value");
    }
    throw new ApiError(500, "Failed to update task");
  }

  return ok(
    res,
    data,
    deleted === true ? "Task deleted successfully" : "Task updated successfully",
  );
});

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

// storage.remove() mengembalikan { error } alih-alih melempar.
async function removeAttachmentFile(supabase, filePath) {
  try {
    const { error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .remove([filePath]);
    if (error) {
      console.error(`Failed to remove file [${filePath}]`, error.message);
    }
  } catch (err) {
    console.error(`Failed to remove file [${filePath}]`, err.message);
  }
}

export const createTaskAttachment = asyncHandler(async (req, res) => {
  const { filePath, fileName, fileType } = req.body ?? {};
  const { taskId } = req.params;
  const { id: userId } = req.profile;

  if (!fileName || !fileType || !filePath)
    throw new ApiError(400, "filePath, fileName and fileType are required");

  // Path tidak valid ditolak TANPA menghapus apa pun: path itu bisa milik task lain.
  if (!isValidAttachmentPath(filePath, taskId)) {
    throw new ApiError(400, "filePath does not match");
  }

  const removeFile = () => removeAttachmentFile(req.supabase, filePath);

  if (!ALLOWED_ATTACHMENT_TYPES.has(fileType)) {
    await removeFile();
    throw new ApiError(400, "fileType must be JPEG, PNG, WEBP, or PDF");
  }

  let cleanFileName;
  try {
    cleanFileName = parseRequiredText(fileName, "fileName", 255);
  } catch (validationError) {
    await removeFile();
    throw validationError;
  }

  const { data, error } = await req.supabase
    .from("task_attachments")
    .insert({
      id: crypto.randomUUID(),
      task_id: taskId,
      file_url: filePath,
      file_name: cleanFileName,
      file_type: fileType,
      uploaded_by_id: userId,
    })
    .select(
      "id, task_id, file_url, file_name, file_type, uploaded_at, uploaded_by_id",
    )
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

  const { error } = await req.supabase
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("task_id", taskId)
    .select("id")
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

  await removeAttachmentFile(req.supabase, attachment.file_url);

  return ok(res, null, "Task attachment deleted");
});
