import React from "react";
import { CalendarDays } from "lucide-react";
import { availableStatuses } from "../../constants/taskConstants";
import { formatStatus } from "../../utils/formatters";

export function TaskStatusForm({
  canUpdateStatus,
  selectedStatus,
  displayedStatus,
  statusLoading,
  statusError,
  onStatusChange,
  onStatusSubmit,
}) {
  return (
    <div className="shrink-0 border-t border-slate-200 bg-white p-4 shadow-lg">
      {canUpdateStatus ? (
        <form
          onSubmit={onStatusSubmit}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <label className="sr-only" htmlFor="task-status">
            Status tugas
          </label>
          <select
            id="task-status"
            value={selectedStatus}
            onChange={onStatusChange}
            disabled={statusLoading}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#0EA5E9] disabled:opacity-60"
          >
            {!availableStatuses.includes(displayedStatus) && (
              <option value={displayedStatus}>
                {formatStatus(displayedStatus)}
              </option>
            )}
            {availableStatuses.map((option) => (
              <option key={option} value={option}>
                {formatStatus(option)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={statusLoading || selectedStatus === displayedStatus}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0284C7] active:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {statusLoading ? "Memperbarui..." : "Update Status"}
          </button>
        </form>
      ) : (
        <p className="m-0 text-center text-xs text-slate-500">
          Role Anda tidak memiliki izin untuk mengubah status tugas.
        </p>
      )}
      {statusError && (
        <p role="alert" className="mb-0 mt-2 text-xs font-medium text-rose-700">
          {statusError}
        </p>
      )}
    </div>
  );
}
