import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/ApiResponse.js";
import { toCsv } from "../utils/csv.js";
import {
  formatLocalTimestamp,
  localDayEndUtc,
  localDayStartUtc,
} from "../utils/dateTime.js";
import { isUuid, parsePaginationParams } from "../utils/queryParams.js";

const EXPORT_MAX_ROWS = 5000;
const CLIENT_SEARCH_MAX_MATCHES = 100;

const HISTORY_TASK_COLUMNS = `id, title, description, status, priority, due_date, completed_at,
  client:clients!tasks_client_id_fkey (id, name, contact, email, address, service_type),
  asset:assets!tasks_asset_id_fkey (id, name, serial_number, type),
  division:divisions!tasks_division_id_fkey (id, name),
  assignments:task_assignments (
    user:users!task_assignments_user_id_fkey (id, name, email)
  )`;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeKeyword(value) {
  return String(value)
    .trim()
    .replace(/^#/, "")
    .replace(/[,()%"*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateFilter(value, field) {
  if (value === undefined || value === "") return undefined;

  const text = String(value);
  const date = new Date(`${text}T00:00:00Z`);
  if (
    !DATE_PATTERN.test(text) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== text
  ) {
    throw new ApiError(400, `${field} must use YYYY-MM-DD format`);
  }

  return text;
}

function parseIdFilter(value, field) {
  if (value === undefined || value === "") return undefined;
  if (!isUuid(String(value))) {
    throw new ApiError(400, `Invalid ${field}`);
  }
  return String(value);
}

function parseHistoryFilters(query) {
  const filters = {
    keyword: query.search ? sanitizeKeyword(query.search) : "",
    clientId: parseIdFilter(query.clientId, "clientId"),
    assetId: parseIdFilter(query.assetId, "assetId"),
    divisionId: parseIdFilter(query.divisionId, "divisionId"),
    technicianId:
      query.technicianId === undefined || query.technicianId === ""
        ? undefined
        : String(query.technicianId),
    completedFrom: parseDateFilter(query.completedFrom, "completedFrom"),
    completedTo: parseDateFilter(query.completedTo, "completedTo"),
    ascending: String(query.sortOrder).toLowerCase() === "asc",
  };

  if (
    filters.completedFrom &&
    filters.completedTo &&
    filters.completedFrom > filters.completedTo
  ) {
    throw new ApiError(400, "completedFrom must be before completedTo");
  }

  return filters;
}

// Mengembalikan { query } berisi task selesai yang sudah difilter, atau { query: null }
// bila filter teknisi tidak cocok. Builder dibungkus objek karena builder Supabase
// bersifat thenable dan akan langsung dieksekusi jika dikembalikan dari fungsi async.
async function buildHistoryQuery(supabase, filters, countOptions) {
  let query = supabase
    .from("tasks")
    .select(HISTORY_TASK_COLUMNS, countOptions)
    .eq("status", "COMPLETED")
    .is("deleted_at", null)
    .order("completed_at", {
      ascending: filters.ascending,
      nullsFirst: false,
    })
    .order("id", { ascending: true });

  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.assetId) query = query.eq("asset_id", filters.assetId);
  if (filters.divisionId) query = query.eq("division_id", filters.divisionId);

  // Tanggal filter dibaca sebagai hari WIB.
  if (filters.completedFrom) {
    query = query.gte("completed_at", localDayStartUtc(filters.completedFrom));
  }
  if (filters.completedTo) {
    query = query.lte("completed_at", localDayEndUtc(filters.completedTo));
  }

  if (filters.keyword) {
    const { data: clients, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", `%${filters.keyword}%`)
      .limit(CLIENT_SEARCH_MAX_MATCHES);

    if (clientError) {
      throw new ApiError(500, "Failed to search service history");
    }

    const conditions = [
      `title.ilike.%${filters.keyword}%`,
      `id.ilike.%${filters.keyword}%`,
    ];
    const clientIds = (clients ?? []).map((client) => client.id);
    if (clientIds.length > 0) {
      conditions.push(`client_id.in.(${clientIds.join(",")})`);
    }

    query = query.or(conditions.join(","));
  }

  if (filters.technicianId) {
    const { data: assignments, error: assignmentError } = await supabase
      .from("task_assignments")
      .select("task_id")
      .eq("user_id", filters.technicianId);

    if (assignmentError) {
      throw new ApiError(500, "Failed to filter service history by technician");
    }

    const taskIds = [
      ...new Set((assignments ?? []).map((assignment) => assignment.task_id)),
    ];
    if (taskIds.length === 0) return { query: null };

    query = query.in("id", taskIds);
  }

  return { query };
}

function handleHistoryQueryError(error) {
  if (error.code === "22P02") {
    throw new ApiError(400, "Invalid filter value");
  }
  if (error.code === "22007" || error.code === "22008") {
    throw new ApiError(400, "Invalid date filter");
  }
  throw new ApiError(500, "Failed to fetch service history");
}

// Satu task boleh punya beberapa report; riwayat menampilkan yang terbaru.
async function fetchLatestReports(supabase, taskIds) {
  if (taskIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("service_reports")
    .select(
      "id, task_id, summary, action_taken, notes, created_at, created_by_id",
    )
    .in("task_id", taskIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(500, "Failed to fetch service reports");
  }

  const latestByTask = new Map();
  for (const report of data ?? []) {
    if (!latestByTask.has(report.task_id)) {
      const { task_id: _taskId, ...rest } = report;
      latestByTask.set(report.task_id, rest);
    }
  }

  return latestByTask;
}

function toHistoryItem(task, report) {
  return {
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      completed_at: task.completed_at,
    },
    report: report ?? null,
    client: task.client ?? null,
    asset: task.asset ?? null,
    division: task.division ?? null,
    technicians: (task.assignments ?? [])
      .map((assignment) => assignment.user)
      .filter(Boolean),
  };
}

async function loadHistoryItems(supabase, tasks) {
  const reports = await fetchLatestReports(
    supabase,
    tasks.map((task) => task.id),
  );
  return tasks.map((task) => toHistoryItem(task, reports.get(task.id)));
}

export const listServiceHistory = asyncHandler(async (req, res) => {
  const filters = parseHistoryFilters(req.query);
  const { safePage, safeLimit, from, to } = parsePaginationParams(
    req.query.page,
    req.query.limit,
  );

  const emptyPage = {
    history: [],
    pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 0 },
  };

  const { query } = await buildHistoryQuery(req.supabase, filters, {
    count: "exact",
  });
  if (!query) return ok(res, emptyPage);

  const { data, count, error } = await query.range(from, to);
  if (error) handleHistoryQueryError(error);

  const total = count ?? 0;
  const history = await loadHistoryItems(req.supabase, data ?? []);

  return ok(res, {
    history,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  });
});

function formatExportDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export const exportServiceHistory = asyncHandler(async (req, res) => {
  const filters = parseHistoryFilters(req.query);

  const { query } = await buildHistoryQuery(req.supabase, filters);

  let history = [];
  if (query) {
    const { data, error } = await query.range(0, EXPORT_MAX_ROWS - 1);
    if (error) handleHistoryQueryError(error);
    history = await loadHistoryItems(req.supabase, data ?? []);
  }

  const csv = toCsv(
    [
      "Task ID",
      "Title",
      "Client",
      "Asset",
      "Division",
      "Technicians",
      "Completed At (WIB)",
      "Priority",
      "Summary",
      "Action Taken",
      "Notes",
    ],
    history.map((item) => [
      item.task.id,
      item.task.title,
      item.client?.name ?? "",
      item.asset
        ? [item.asset.name, item.asset.serial_number]
            .filter(Boolean)
            .join(" - ")
        : "",
      item.division?.name ?? "",
      item.technicians.map((technician) => technician.name).join("; "),
      formatLocalTimestamp(item.task.completed_at),
      item.task.priority,
      item.report?.summary ?? "",
      item.report?.action_taken ?? "",
      item.report?.notes ?? "",
    ]),
  );

  const filename = `service-history-${formatExportDate(new Date())}.csv`;

  res.status(200);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(csv);
});
