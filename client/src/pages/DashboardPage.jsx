import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Loading } from "../components/Loading";
import { useTask } from "../contexts/TaskContext";
import { useToast } from "../contexts/ToastContext";
import { formatTaskId } from "../utils/formatTaskId";

const statusStyles = {
  PENDING: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  ON_HOLD: "bg-slate-100 text-slate-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

const statusLabels = {
  PENDING: "Menunggu",
  IN_PROGRESS: "Dikerjakan",
  ON_HOLD: "Ditunda",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const priorityStyles = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-sky-50 text-sky-700",
  HIGH: "bg-orange-50 text-orange-700",
  URGENT: "bg-rose-50 text-rose-700",
};

function formatDate(dateValue) {
  if (!dateValue) return "Tidak ada tenggat";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(date);
}

function isToday(dateValue) {
  if (!dateValue) return false;

  const date = new Date(dateValue);
  const today = new Date();
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function assigneeNames(assignments) {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return "Belum ditugaskan";
  }

  const names = assignments
    .map((assignment) => assignment.user?.name)
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : "Nama teknisi tidak tersedia";
}

export default function DashboardPage() {
  const toast = useToast();
  const { tasks, loading, error, onRefreshTasks: fetchTasks } = useTask();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const activeTasks = tasks.filter(
    (task) => task.status !== "COMPLETED" && task.status !== "CANCELLED",
  ).length;
  const completedToday = tasks.filter(
    (task) => task.status === "COMPLETED" && isToday(task.updated_at),
  ).length;
  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    return tasks.filter((task) => {
      const divisionName = task.division?.name?.toLocaleLowerCase() || "";
      const matchesFilter =
        activeFilter === "ALL" ||
        (activeFilter === "NETWORK" && divisionName.includes("network")) ||
        (activeFilter === "PC_REPAIR" &&
          (divisionName.includes("pc") || divisionName.includes("repair"))) ||
        (activeFilter === "URGENT" && task.priority === "URGENT");
      const matchesSearch =
        !normalizedQuery ||
        [
          task.id,
          task.title,
          task.client?.name,
          task.division?.name,
          task.status,
          task.priority,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase().includes(normalizedQuery),
          );

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchQuery, tasks]);

  const filters = [
    { id: "ALL", label: "All Tickets" },
    { id: "NETWORK", label: "Network Issue" },
    { id: "PC_REPAIR", label: "PC Repair" },
    { id: "URGENT", label: "Urgent" },
  ];

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-xl font-bold text-slate-900 sm:text-2xl">
          Dashboard
        </h1>
        <p className="m-0 mt-1 text-xs text-slate-500 sm:text-sm">
          Overview operasional tiket dan penugasan teknisi
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Tasks
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-[#0EA5E9]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {activeTasks}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Completed Today
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {completedToday}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchTasks}
            className="shrink-0 font-semibold underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      )}

      <section
        aria-label="Filter and add tickets"
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-[1181px]:flex-row min-[1181px]:items-center min-[1181px]:justify-between"
      >
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1 min-[1181px]:pb-0"
          aria-label="Filter tickets"
        >
          {filters.map((filter) => {
            const selected = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveFilter(filter.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "bg-[#0EA5E9] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row min-[1181px]:shrink-0">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:ring-2 focus-within:ring-[#0EA5E9] min-[1181px]:w-64">
            <span className="sr-only">Cari tiket</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 shrink-0 text-slate-400"
            >
              <circle cx="8.75" cy="8.75" r="5.75" stroke="currentColor" strokeWidth="1.5" />
              <path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari tiket atau klien..."
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-slate-400 focus:ring-0"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              toast.info("Form tambah tiket belum tersedia.")
            }
            className="shrink-0 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0284C7]"
          >
            + Add Ticket
          </button>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Tugas & Klien</th>
                <th className="px-4 py-3">Teknisi</th>
                <th className="px-4 py-3">Divisi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prioritas</th>
                <th className="px-4 py-3">Tenggat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="transition hover:bg-slate-50">
                  <td className="break-all px-4 py-3 font-semibold text-slate-900">
                    {formatTaskId(task.id)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">
                      {task.title}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {task.client?.name || "Klien tidak diketahui"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {assigneeNames(task.assignments)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {task.division?.name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[task.status] || "bg-slate-100 text-slate-700"}`}
                    >
                      {statusLabels[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${priorityStyles[task.priority] || "bg-slate-100 text-slate-700"}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(task.due_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 xl:hidden">
          {filteredTasks.map((task) => (
            <article
              key={task.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="break-all text-xs font-bold text-slate-500">
                  {formatTaskId(task.id)}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityStyles[task.priority] || "bg-slate-100 text-slate-700"}`}
                  >
                    {task.priority}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyles[task.status] || "bg-slate-100 text-slate-700"}`}
                  >
                    {statusLabels[task.status] || task.status}
                  </span>
                </div>
              </div>
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                {task.title}
              </h3>
              <div className="mb-3 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">
                  {task.client?.name || "Klien tidak diketahui"}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="text-slate-400">Teknisi</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {assigneeNames(task.assignments)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Divisi</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {task.division?.name || "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-400">Tenggat</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {formatDate(task.due_date)}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        {filteredTasks.length === 0 && !error && (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            {tasks.length === 0
              ? "Belum ada tugas untuk ditampilkan."
              : "Tidak ada tiket yang cocok dengan pencarian atau filter ini."}
          </p>
        )}
      </div>
    </div>
  );
}
