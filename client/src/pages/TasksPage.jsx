import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useDivisions } from "../hooks/useDivisions";
import { useTasks } from "../hooks/useTasks";
import { useUsers } from "../hooks/useUsers";
import { TaskCardList } from "../components/tasks/TaskCardList";
import { TaskCreateDialog } from "../components/tasks/TaskCreateDialog";
import { TaskFilterBar } from "../components/tasks/TaskFilterBar";
import { TaskPagination } from "../components/tasks/TaskPagination";
import { TaskTable } from "../components/tasks/TaskTable";
import {
  availableStatuses,
  priorityOptions,
  taskCreateRoles,
} from "../constants/taskConstants";

const DEFAULT_LIMIT = 20;
const DEFAULT_SORT_BY = "created_at";
const DEFAULT_SORT_ORDER = "desc";
const allowedSortFields = new Set(["created_at", "due_date"]);

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { userProfile } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    100,
  );
  const search = (searchParams.get("search") || "").trim();
  const statusParam = searchParams.get("status") || "";
  const priorityParam = searchParams.get("priority") || "";
  const status = availableStatuses.includes(statusParam) ? statusParam : "";
  const priority = priorityOptions.includes(priorityParam)
    ? priorityParam
    : "";
  const divisionId = searchParams.get("divisionId") || "";
  const clientId = searchParams.get("clientId") || "";
  const technicianId = searchParams.get("technicianId") || "";
  const dueFrom = searchParams.get("dueFrom") || "";
  const dueTo = searchParams.get("dueTo") || "";
  const sortByParam = searchParams.get("sortBy") || DEFAULT_SORT_BY;
  const sortBy = allowedSortFields.has(sortByParam)
    ? sortByParam
    : DEFAULT_SORT_BY;
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const filters = useMemo(
    () => ({
      search,
      status,
      priority,
      divisionId,
      clientId,
      technicianId,
      dueFrom,
      dueTo,
      sortBy,
      sortOrder,
      page,
      limit,
    }),
    [
      clientId,
      divisionId,
      dueFrom,
      dueTo,
      limit,
      page,
      priority,
      search,
      sortBy,
      sortOrder,
      status,
      technicianId,
    ],
  );

  const queryParams = useMemo(() => {
    const params = { page, limit, sortBy, sortOrder };

    if (search) params.search = search.replace(/^#/, "");
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (divisionId) params.divisionId = divisionId;
    if (clientId) params.clientId = clientId;
    if (technicianId) params.technicianId = technicianId;
    if (dueFrom) params.dueFrom = dueFrom;
    if (dueTo) params.dueTo = dueTo;

    return params;
  }, [
    clientId,
    divisionId,
    dueFrom,
    dueTo,
    limit,
    page,
    priority,
    search,
    sortBy,
    sortOrder,
    status,
    technicianId,
  ]);

  const { tasks, pagination, loading, error, refetch } = useTasks(queryParams);
  const { divisions } = useDivisions();
  const { users: technicians } = useUsers({ role: "TECHNICIAN" });

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const updateFilters = useCallback(
    (updates) => {
      setSearchParams((previousParams) => {
        const nextParams = new URLSearchParams(previousParams);

        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") {
            nextParams.delete(key);
          } else {
            nextParams.set(key, String(value));
          }
        });

        if (!Object.prototype.hasOwnProperty.call(updates, "page")) {
          nextParams.delete("page");
        }

        return nextParams;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim();
    if (normalizedSearch === search) return;
    updateFilters({ search: normalizedSearch });
  }, [debouncedSearch, search, updateFilters]);

  const handleFilterChange = (key, value) => {
    updateFilters({ [key]: value });
  };

  const handleSortChange = (value) => {
    const [nextSortBy, nextSortOrder] = value.split(":");
    updateFilters({ sortBy: nextSortBy, sortOrder: nextSortOrder });
  };

  const handlePageChange = (nextPage) => {
    updateFilters({ page: nextPage > 1 ? nextPage : undefined });
  };

  const handleLimitChange = (nextLimit) => {
    updateFilters({ limit: nextLimit === DEFAULT_LIMIT ? undefined : nextLimit });
  };

  const handleClearFilters = () => {
    const nextParams = new URLSearchParams();
    if (limit !== DEFAULT_LIMIT) nextParams.set("limit", String(limit));
    setSearchParams(nextParams);
    setSearchInput("");
  };

  const hasActiveFilters = Boolean(
    search ||
      status ||
      priority ||
      divisionId ||
      clientId ||
      technicianId ||
      dueFrom ||
      dueTo ||
      sortBy !== DEFAULT_SORT_BY ||
      sortOrder !== DEFAULT_SORT_ORDER ||
      page > 1 ||
      limit !== DEFAULT_LIMIT,
  );

  const hasSearchFilters = Boolean(
    search ||
      status ||
      priority ||
      divisionId ||
      clientId ||
      technicianId ||
      dueFrom ||
      dueTo,
  );

  const userRole =
    typeof userProfile?.role === "string"
      ? userProfile.role.toUpperCase()
      : "";
  const canCreate = taskCreateRoles.has(userRole);

  const handleCreate = () => {
    setCreateOpen(true);
  };

  const handleTaskCreated = () => {
    if (page !== 1) {
      updateFilters({ page: undefined });
    } else {
      refetch();
    }
  };

  const emptyMessage = hasSearchFilters
    ? "Tidak ada tiket yang cocok dengan filter saat ini."
    : "Belum ada tiket untuk ditampilkan.";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-bold text-slate-900">
            Tasks &amp; Tickets
          </h1>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Kelola tiket layanan, status, prioritas, dan penugasan teknisi.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          {loading && tasks.length > 0 && (
            <LoaderCircle className="h-4 w-4 animate-spin text-[#0EA5E9]" />
          )}
          <span>{pagination?.total ?? tasks.length} tiket</span>
        </div>
      </div>

      <TaskFilterBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filters={filters}
        divisions={divisions}
        technicians={technicians}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onClear={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        canCreate={canCreate}
        onCreate={handleCreate}
      />

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={refetch}
            className="self-start rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-rose-100 sm:self-auto"
          >
            Coba lagi
          </button>
        </div>
      )}

      <div
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        aria-busy={loading}
      >
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#0EA5E9]" />
            Memuat tiket...
          </div>
        ) : (
          <>
            <TaskTable tasks={tasks} emptyMessage={emptyMessage} />
            <TaskCardList tasks={tasks} emptyMessage={emptyMessage} />
            {pagination?.total > 0 && (
              <TaskPagination
                pagination={pagination}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                loading={loading}
              />
            )}
          </>
        )}
      </div>

      <TaskCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleTaskCreated}
      />
    </div>
  );
}
