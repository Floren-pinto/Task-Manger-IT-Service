import React from "react";
import { Link } from "react-router-dom";
import { X, MapPin } from "lucide-react";
import { formatStatus } from "../../utils/formatters";
import { statusStyles, priorityStyles } from "../../constants/taskConstants";

export function TaskHeader({ task, taskId, displayedStatus, returnTo }) {
  return (
    <header className="shrink-0 border-b border-slate-100 px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="break-all text-xs font-bold text-slate-500">
            {task.id || taskId || "Ticket ID tidak tersedia"}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              statusStyles[displayedStatus] ||
              "border-slate-200 bg-slate-100 text-slate-700"
            }`}
          >
            {formatStatus(displayedStatus)}
          </span>
        </div>
        <Link
          to={returnTo}
          aria-label="Tutup detail tugas"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      <h1 className="mb-0 mt-4 break-words text-xl font-bold leading-snug text-slate-900">
        {task.title || "Tugas tanpa judul"}
      </h1>
      <p className="mb-0 mt-2 flex items-center gap-1.5 text-sm text-slate-500">
        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="break-words">
          {task.client?.name || "Klien tidak tersedia"}
        </span>
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-bold ${
            priorityStyles[task.priority] || "bg-slate-100 text-slate-600"
          }`}
        >
          {task.priority || "Prioritas tidak tersedia"}
        </span>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {task.division?.name || "Divisi belum ditentukan"}
        </span>
      </div>
    </header>
  );
}
