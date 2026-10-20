import { Link, useLocation } from "react-router-dom";
import {
  assigneeNames,
  formatDate,
  formatPriority,
  formatStatus,
} from "../../utils/formatters";
import { formatTaskId } from "../../utils/formatTaskId";
import { priorityStyles, statusStyles } from "../../constants/taskConstants";

export function TaskTable({
  tasks = [],
  emptyMessage = "Belum ada tiket untuk ditampilkan.",
}) {
  const location = useLocation();

  if (tasks.length === 0) {
    return (
      <p className="hidden px-4 py-10 text-center text-sm text-slate-500 xl:block">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">ID</th>
            <th className="px-4 py-3 font-semibold">Tugas &amp; Klien</th>
            <th className="px-4 py-3 font-semibold">Teknisi</th>
            <th className="px-4 py-3 font-semibold">Divisi</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Prioritas</th>
            <th className="px-4 py-3 font-semibold">Tenggat</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const taskPath = `/tasks/${task.id}`;
            const taskLinkState = { state: { backgroundLocation: location } };

            return (
              <tr
                key={task.id}
                className="align-top transition-colors hover:bg-slate-50/80"
              >
                <td className="whitespace-nowrap px-4 py-4">
                  <Link
                    to={taskPath}
                    {...taskLinkState}
                    className="text-xs font-bold text-slate-500 transition-colors hover:text-[#0EA5E9]"
                  >
                    {formatTaskId(task.id)}
                  </Link>
                </td>
                <td className="px-4 py-4">
                  <Link
                    to={taskPath}
                    {...taskLinkState}
                    className="block max-w-[320px] font-semibold text-slate-800 transition-colors hover:text-[#0EA5E9]"
                  >
                    {task.title || "Tanpa judul"}
                  </Link>
                  <span className="mt-1 block truncate text-xs text-slate-400">
                    {task.client?.name || "Klien tidak tersedia"}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-slate-600">
                  <span className="line-clamp-2 inline-block max-w-[190px]">
                    {assigneeNames(task.assignments)}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-slate-600">
                  {task.division?.name || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      statusStyles[task.status] ||
                      "border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                  >
                    {formatStatus(task.status)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      priorityStyles[task.priority] ||
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {formatPriority(task.priority)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                  {formatDate(task.due_date)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
