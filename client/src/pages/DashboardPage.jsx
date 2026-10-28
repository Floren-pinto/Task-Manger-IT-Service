import { useCallback, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading";
import { TaskCardList } from "../components/tasks/TaskCardList";
import { TaskCreateDialog } from "../components/tasks/TaskCreateDialog";
import { TaskTable } from "../components/tasks/TaskTable";
import { useAuth } from "../contexts/AuthContext";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { useTasks } from "../hooks/useTasks";
import { useTasksChanged } from "../hooks/useTasksChanged";
import {
  availableStatuses,
  statusLabels,
  statusStyles,
  taskCreateRoles,
} from "../constants/taskConstants";

const recentTaskParams = {
  page: 1,
  limit: 5,
  sortBy: "created_at",
  sortOrder: "desc",
};

function MetricCard({ label, value, note, icon: Icon, accentClassName }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="m-0 mt-2 text-3xl font-bold leading-none text-slate-900">
            {value}
          </p>
          {note && <p className="m-0 mt-2 text-xs text-slate-400">{note}</p>}
        </div>
        <span className={`shrink-0 rounded-xl p-2.5 ${accentClassName}`}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function WorkloadCard({ title, items, emptyMessage, meta }) {
  const visibleItems = items
    .filter((item) => Number(item.total) > 0)
    .slice(0, 5);
  const maxTotal = Math.max(
    ...visibleItems.map((item) => Number(item.total) || 0),
    1,
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="m-0 text-sm font-bold text-slate-800">{title}</h2>

      {visibleItems.length === 0 ? (
        <p className="m-0 mt-3 text-xs text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visibleItems.map((item) => (
            <li key={item.id || item.name}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-slate-700">
                  {item.name || "Tanpa nama"}
                </span>
                <span className="shrink-0 text-slate-500">
                  {meta ? meta(item) : `${item.total ?? 0} tiket`}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#0EA5E9]"
                  style={{
                    width: `${Math.min(
                      ((Number(item.total) || 0) / maxTotal) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { role: userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useDashboardSummary();
  const {
    tasks: recentTasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useTasks(recentTaskParams);

  const handleTasksChanged = useCallback(() => {
    void refetchSummary();
    void refetchTasks();
  }, [refetchSummary, refetchTasks]);

  useTasksChanged(handleTasksChanged);

  const canCreate = taskCreateRoles.has(userRole);

  const initialLoading =
    (summaryLoading && !summary) ||
    (tasksLoading && recentTasks.length === 0);

  if (initialLoading) return <Loading />;

  const byStatus = summary?.byStatus || {};
  const byDivision = Array.isArray(summary?.byDivision)
    ? summary.byDivision
    : [];
  const byTechnician = Array.isArray(summary?.byTechnician)
    ? summary.byTechnician
    : [];
  const errorMessage = summaryError || tasksError;

  const metricValue = (key) =>
    summary ? (summary[key] ?? 0) : "—";

  const handleSearch = (event) => {
    event.preventDefault();
    const keyword = searchQuery.trim();

    if (keyword) {
      navigate(`/tasks?search=${encodeURIComponent(keyword)}`);
    } else {
      navigate("/tasks");
    }
  };

  const handleTaskCreated = () => {
    void refetchSummary();
    void refetchTasks();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-xl font-bold text-slate-900 sm:text-2xl">
            Dashboard
          </h1>
          <p className="m-0 mt-1 text-xs text-slate-500 sm:text-sm">
            Ringkasan operasional tiket dan beban kerja tim.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0284C7]"
          >
            <Plus className="h-4 w-4" />
            Tambah Tiket
          </button>
        )}
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari judul atau #ID tiket..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#0EA5E9] focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cari Tiket
        </button>
      </form>

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="m-0 font-medium">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void refetchSummary();
              void refetchTasks();
            }}
            className="self-start rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-rose-100 sm:self-auto"
          >
            Coba lagi
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tugas Aktif"
          value={metricValue("activeTasks")}
          note="Belum selesai atau dibatalkan"
          icon={Activity}
          accentClassName="bg-sky-50 text-sky-600"
        />
        <MetricCard
          label="Selesai Hari Ini"
          value={metricValue("completedToday")}
          note="Berdasarkan riwayat status"
          icon={CheckCircle2}
          accentClassName="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          label="Melewati Tenggat"
          value={metricValue("overdue")}
          note="Tenggat sudah lewat"
          icon={AlertTriangle}
          accentClassName="bg-rose-50 text-rose-600"
        />
        <MetricCard
          label="Belum Ditugaskan"
          value={metricValue("unassigned")}
          note="Aktif tanpa teknisi"
          icon={UserRound}
          accentClassName="bg-amber-50 text-amber-600"
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-sm font-bold text-slate-800">
            Ringkasan Status
          </h2>
          <Link
            to="/tasks"
            className="text-xs font-semibold text-[#0EA5E9] transition hover:text-[#0284C7]"
          >
            Kelola semua tiket
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {availableStatuses.map((status) => (
            <Link
              key={status}
              to={`/tasks?status=${status}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80 ${
                statusStyles[status] ||
                "border-slate-200 bg-slate-100 text-slate-700"
              }`}
            >
              {statusLabels[status] || status}
              <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold">
                {summary ? (byStatus[status] ?? 0) : "—"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkloadCard
          title="Beban per Divisi"
          items={byDivision}
          emptyMessage={
            summary
              ? "Belum ada tiket pada divisi mana pun."
              : "Ringkasan beban divisi belum tersedia."
          }
        />
        <WorkloadCard
          title="Beban per Teknisi"
          items={byTechnician}
          emptyMessage={
            summary
              ? "Belum ada penugasan teknisi."
              : "Ringkasan beban teknisi belum tersedia."
          }
          meta={(item) => `${item.completed ?? 0}/${item.total ?? 0} selesai`}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="m-0 text-sm font-bold text-slate-800">
              Tiket Terbaru
            </h2>
            <p className="m-0 mt-0.5 text-xs text-slate-500">
              5 tiket terbaru sesuai akses Anda.
            </p>
          </div>
          <Link
            to="/tasks"
            className="text-xs font-semibold text-[#0EA5E9] transition hover:text-[#0284C7]"
          >
            Lihat semua
          </Link>
        </div>

        {tasksLoading && recentTasks.length > 0 && (
          <div className="border-b border-slate-100 bg-sky-50 px-4 py-2 text-xs text-sky-700">
            Memperbarui daftar tiket...
          </div>
        )}

        <TaskTable tasks={recentTasks} emptyMessage="Belum ada tiket." />
        <TaskCardList tasks={recentTasks} emptyMessage="Belum ada tiket." />
      </div>

      <TaskCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleTaskCreated}
      />
    </div>
  );
}
