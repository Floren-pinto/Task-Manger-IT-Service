import { RotateCcw, Search } from "lucide-react";
import { formInputClassName } from "../ui/FormField";

export function ClientFilterBar({
  searchInput,
  onSearchChange,
  includeDeleted = false,
  onIncludeDeletedChange,
  canIncludeDeleted = false,
  onClear,
  hasActiveFilters = false,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Cari client
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cari nama client..."
              className={`${formInputClassName} pl-9`}
            />
          </div>
        </label>

        {canIncludeDeleted && (
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(event) =>
                onIncludeDeletedChange(event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 accent-[#0EA5E9]"
            />
            Tampilkan arsip
          </label>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset filter
        </button>
      </div>
    </section>
  );
}
