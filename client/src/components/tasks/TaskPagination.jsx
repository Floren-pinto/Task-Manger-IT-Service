import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageSizeOptions } from "../../constants/taskConstants";

export function TaskPagination({
  pagination,
  onPageChange,
  onLimitChange,
  loading = false,
}) {
  if (!pagination) return null;

  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 20;
  const total = Number(pagination.total) || 0;
  const totalPages = Number(pagination.totalPages) || 0;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const canGoPrevious = page > 1 && !loading;
  const canGoNext = page < totalPages && !loading;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Menampilkan{" "}
        <span className="font-semibold text-slate-700">
          {start}-{end}
        </span>{" "}
        dari <span className="font-semibold text-slate-700">{total}</span> tiket
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Baris
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrevious}
            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="min-w-[86px] text-center text-xs font-medium text-slate-600">
            Halaman {page} / {totalPages || 1}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext}
            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
