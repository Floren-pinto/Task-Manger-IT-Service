import { RotateCcw, Search } from "lucide-react";
import { ClientPicker } from "../tasks/ClientPicker";
import { formatAssetLabel, personName } from "../../utils/formatters";

function FilterField({ label, children, className = "" }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#0EA5E9] focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50";

export function ServiceHistoryFilterBar({
  searchInput,
  onSearchChange,
  filters,
  selectedClient,
  onClientChange,
  assets = [],
  assetsLoading = false,
  divisions = [],
  technicians = [],
  onFilterChange,
  onClear,
  hasActiveFilters = false,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FilterField label="Cari tugas / klien" className="md:col-span-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cari judul, #ID tiket, atau nama klien..."
              aria-label="Cari tugas atau klien"
              className={`${inputClassName} pl-9`}
            />
          </div>
        </FilterField>

        <FilterField label="Klien" className="md:col-span-2">
          <ClientPicker value={selectedClient} onChange={onClientChange} />
        </FilterField>

        <FilterField label="Aset">
          <select
            value={filters.assetId || ""}
            onChange={(event) => onFilterChange("assetId", event.target.value)}
            disabled={!filters.clientId || assetsLoading}
            aria-label="Filter aset"
            className={inputClassName}
          >
            <option value="">
              {filters.clientId ? "Semua aset" : "Pilih klien dulu"}
            </option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {formatAssetLabel(asset)}
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
            aria-label="Filter divisi"
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
            aria-label="Filter teknisi"
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

        <FilterField label="Urutkan">
          <select
            value={filters.sortOrder || "desc"}
            onChange={(event) =>
              onFilterChange(
                "sortOrder",
                event.target.value === "desc" ? "" : event.target.value,
              )
            }
            aria-label="Urutkan riwayat"
            className={inputClassName}
          >
            <option value="desc">Selesai terbaru</option>
            <option value="asc">Selesai terlama</option>
          </select>
        </FilterField>

        <FilterField label="Selesai dari">
          <input
            type="date"
            value={filters.completedFrom || ""}
            max={filters.completedTo || undefined}
            onChange={(event) =>
              onFilterChange("completedFrom", event.target.value)
            }
            aria-label="Tanggal selesai dari"
            className={inputClassName}
          />
        </FilterField>

        <FilterField label="Selesai sampai">
          <input
            type="date"
            value={filters.completedTo || ""}
            min={filters.completedFrom || undefined}
            onChange={(event) =>
              onFilterChange("completedTo", event.target.value)
            }
            aria-label="Tanggal selesai sampai"
            className={inputClassName}
          />
        </FilterField>
      </div>

      <div className="mt-4 flex border-t border-slate-100 pt-4">
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
