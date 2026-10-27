import { AlertCircle, ChevronRight, LoaderCircle, Plus } from "lucide-react";
import { formatDate, personName } from "../../utils/formatters";

export function TaskReportsSection({
  reports = [],
  loading = false,
  error = null,
  onRetry,
  canCreate = false,
  createHint,
  onCreate,
  onSelect,
}) {
  return (
    <div className="space-y-3">
      {(canCreate || createHint) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {createHint && (
            <p className="m-0 text-xs text-slate-500">{createHint}</p>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-[#0EA5E9] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0284C7] sm:ml-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              Buat Laporan
            </button>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="self-start rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold transition hover:bg-rose-100 sm:self-auto"
          >
            Coba lagi
          </button>
        </div>
      )}

      {loading && reports.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin text-[#0EA5E9]" />
          Memuat laporan servis...
        </div>
      ) : reports.length === 0 ? (
        !error && (
          <p className="m-0 text-sm text-slate-500">
            Belum ada laporan servis.
          </p>
        )
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {reports.map((report) => (
            <li key={report.id}>
              <button
                type="button"
                onClick={() => onSelect(report)}
                className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-sky-200 hover:bg-sky-50/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold text-slate-800">
                    {report.summary}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block break-words text-xs text-slate-600">
                    {report.action_taken}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-400">
                    {personName(report.createdBy)} ·{" "}
                    {formatDate(report.created_at, true)}
                  </span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
