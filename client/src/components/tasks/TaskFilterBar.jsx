import { Plus, RotateCcw, Search } from "lucide-react";
import {
  availableStatuses,
  priorityLabels,
  priorityOptions,
  statusLabels,
  taskSortOptions,
} from "../../constants/taskConstants";
import { personName } from "../../utils/formatters";

function FilterField({ label, children, className = "" }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#0EA5E9] focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50";

export function TaskFilterBar({
  searchInput,
  onSearchChange,
  filters,
  divisions = [],
  technicians = [],
  onFilterChange,
  onSortChange,
  onClear,
  hasActiveFilters = false,
  canCreate = false,
  onCreate,
}) {
  const sortValue = `${filters.sortBy || "created_at"}:${
    filters.sortOrder || "desc"
  }`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FilterField
          label="Cari tiket"
          className="md:col-span-2 xl:col-span-2"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cari judul atau #ID tiket..."
              className={`${inputClassName} pl-9`}
            />
          </div>
        </FilterField>

        <FilterField label="Status">
          <select
            value={filters.status || ""}
            onChange={(event) => onFilterChange("status", event.target.value)}
            className={inputClassName}
          >
            <option value="">Semua status</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status] || status}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Prioritas">
          <select
            value={filters.priority || ""}
            onChange={(event) => onFilterChange("priority", event.target.value)}
            className={inputClassName}
          >
            <option value="">Semua prioritas</option>
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority] || priority}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Divisi">
          <select
            value={filters.divisionId || ""}
            onChange={(event) =>
              onFilterChange("divisionId", event.target.value)
            }
            className={inputClassName}
          >
            <option value="">Semua divisi</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Teknisi">
          <select
            value={filters.technicianId || ""}
            onChange={(event) =>
              onFilterChange("technicianId", event.target.value)
            }
            className={inputClassName}
          >
            <option value="">Semua teknisi</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {personName(technician)}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Tenggat dari">
          <input
            type="date"
            value={filters.dueFrom || ""}
            max={filters.dueTo || undefined}
            onChange={(event) =>
              onFilterChange("dueFrom", event.target.value)
            }
            className={inputClassName}
          />
        </FilterField>

        <FilterField label="Tenggat sampai">
          <input
            type="date"
            value={filters.dueTo || ""}
            min={filters.dueFrom || undefined}
            onChange={(event) => onFilterChange("dueTo", event.target.value)}
            className={inputClassName}
          />
        </FilterField>

        <FilterField label="Urutkan">
          <select
            value={sortValue}
            onChange={(event) => onSortChange(event.target.value)}
            className={inputClassName}
          >
            {taskSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset filter
        </button>

        {canCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7]"
          >
            <Plus className="h-4 w-4" />
            Tambah Tiket
          </button>
        )}
      </div>
    </section>
  );
}
