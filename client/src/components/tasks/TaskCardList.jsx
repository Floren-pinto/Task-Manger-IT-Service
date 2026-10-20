import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  assigneeNames,
  formatDate,
  formatPriority,
  formatStatus,
} from "../../utils/formatters";
import { formatTaskId } from "../../utils/formatTaskId";
import { priorityStyles, statusStyles } from "../../constants/taskConstants";

export function TaskCardList({
  tasks = [],
  emptyMessage = "Belum ada tiket untuk ditampilkan.",
}) {
  const location = useLocation();

  if (tasks.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-slate-500 xl:hidden">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid gap-3 p-4 xl:hidden">
      {tasks.map((task) => (
        <Link
          key={task.id}
          to={`/tasks/${task.id}`}
          state={{ backgroundLocation: location }}
          className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-sky-200 hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-400">
                {formatTaskId(task.id)}
              </span>
              <h3 className="mt-1 text-sm font-semibold text-slate-800 group-hover:text-[#0EA5E9]">
                {task.title || "Tanpa judul"}
              </h3>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#0EA5E9]" />
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {task.client?.name || "Klien tidak tersedia"}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {task.division?.name || "Divisi belum ditentukan"}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                statusStyles[task.status] ||
                "border-slate-200 bg-slate-100 text-slate-700"
              }`}
            >
              {formatStatus(task.status)}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                priorityStyles[task.priority] || "bg-slate-100 text-slate-600"
              }`}
            >
              {formatPriority(task.priority)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <span className="truncate">
              {assigneeNames(task.assignments)}
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(task.due_date)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
