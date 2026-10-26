import { RotateCcw, Search } from "lucide-react";
import {
  USER_ROLES,
  formatRole,
  statusFilterOptions,
} from "../../constants/userConstants";
import { formInputClassName } from "../ui/FormField";

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

export function UserFilterBar({
  searchInput,
  onSearchChange,
  role = "all",
  onRoleChange,
  division = "all",
  onDivisionChange,
  divisions = [],
  status = "all",
  onStatusChange,
  includeDeleted = false,
  onIncludeDeletedChange,
  onClear,
  hasActiveFilters = false,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <FilterField label="Cari pengguna" className="flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cari nama atau email..."
              className={`${formInputClassName} pl-9`}
            />
          </div>
        </FilterField>

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

      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-4">
        <FilterField label="Role">
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value)}
            className={formInputClassName}
          >
            <option value="all">Semua role</option>
            {USER_ROLES.map((roleValue) => (
              <option key={roleValue} value={roleValue}>
                {formatRole(roleValue)}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Divisi">
          <select
            value={division}
            onChange={(event) => onDivisionChange(event.target.value)}
            className={formInputClassName}
          >
            <option value="all">Semua divisi</option>
            {divisions.map((divisionItem) => (
              <option key={divisionItem.id} value={divisionItem.id}>
                {divisionItem.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Status">
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className={formInputClassName}
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>

        <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(event) => onIncludeDeletedChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-[#0EA5E9]"
          />
          Tampilkan arsip
        </label>
      </div>
    </section>
  );
}
