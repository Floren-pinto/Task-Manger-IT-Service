import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Download, LoaderCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import { useClientDetail } from "../hooks/useClientDetail";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useDivisions } from "../hooks/useDivisions";
import { useServiceHistory } from "../hooks/useServiceHistory";
import { useTasksChanged } from "../hooks/useTasksChanged";
import { useUsers } from "../hooks/useUsers";
import { exportServiceHistory } from "../services/serviceHistoryService";
import { ServiceHistoryCardList } from "../components/history/ServiceHistoryCardList";
import { ServiceHistoryDetailDialog } from "../components/history/ServiceHistoryDetailDialog";
import { ServiceHistoryFilterBar } from "../components/history/ServiceHistoryFilterBar";
import { ServiceHistoryTable } from "../components/history/ServiceHistoryTable";
import { TaskReportDetailDialog } from "../components/tasks/TaskReportDetailDialog";
import { DataPagination } from "../components/ui/DataPagination";
import { pageSizeOptions } from "../constants/taskConstants";

const defaultHistoryLimit = 20;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const filterKeys = [
  "clientId",
  "assetId",
  "divisionId",
  "technicianId",
  "completedFrom",
  "completedTo",
  "sortOrder",
];

function readUuid(value) {
  return value && UUID_PATTERN.test(value) ? value : "";
}

function readDate(value) {
  return value && DATE_PATTERN.test(value) ? value : "";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function ServiceHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { divisions } = useDivisions();
  const technicianParams = useMemo(() => ({ role: "TECHNICIAN" }), []);
  const { users: technicians } = useUsers(technicianParams);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  const rawPage = Number(searchParams.get("page"));
  const page = Number.isFinite(rawPage)
    ? Math.max(Math.floor(rawPage), 1)
    : 1;
  const rawLimit = Number(searchParams.get("limit"));
  const limit = pageSizeOptions.includes(rawLimit)
    ? rawLimit
    : defaultHistoryLimit;
  const search = (searchParams.get("search") || "").trim();

  const filters = useMemo(
    () => ({
      clientId: readUuid(searchParams.get("clientId")),
      assetId: readUuid(searchParams.get("assetId")),
      divisionId: readUuid(searchParams.get("divisionId")),
      technicianId: searchParams.get("technicianId") || "",
      completedFrom: readDate(searchParams.get("completedFrom")),
      completedTo: readDate(searchParams.get("completedTo")),
      sortOrder: searchParams.get("sortOrder") === "asc" ? "asc" : "",
    }),
    [searchParams],
  );

  const filterParams = useMemo(() => {
    const params = {};
    if (search) params.search = search;
    filterKeys.forEach((key) => {
      if (filters[key]) params[key] = filters[key];
    });
    return params;
  }, [filters, search]);

  const queryParams = useMemo(
    () => ({ ...filterParams, page, limit }),
    [filterParams, limit, page],
  );

  const { history, pagination, loading, error, refetch } =
    useServiceHistory(queryParams);

  useTasksChanged(refetch);

  const { client: selectedClient, assets, loading: assetsLoading } =
    useClientDetail(filters.clientId || null);

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const updateFilters = useCallback(
    (updates) => {
      setSearchParams((previousParams) => {
        const nextParams = new URLSearchParams(previousParams);

        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") {
            nextParams.delete(key);
          } else {
            nextParams.set(key, String(value));
          }
        });

        if (!Object.prototype.hasOwnProperty.call(updates, "page")) {
          nextParams.delete("page");
        }

        return nextParams;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    // Tunggu debounce mengejar input; tanpa ini nilai lama bisa menulis ulang
    // search setelah "Reset filter".
    if (debouncedSearch !== searchInput) return;
    const normalizedSearch = debouncedSearch.trim();
    if (normalizedSearch === search) return;
    updateFilters({ search: normalizedSearch });
  }, [debouncedSearch, search, searchInput, updateFilters]);

  const handleFilterChange = (key, value) => {
    updateFilters({ [key]: value });
  };

  const handleClientChange = (client) => {
    updateFilters({ clientId: client?.id, assetId: undefined });
  };

  const handlePageChange = (nextPage) => {
    updateFilters({ page: nextPage > 1 ? nextPage : undefined });
  };

  const handleLimitChange = (nextLimit) => {
    updateFilters({
      limit: nextLimit === defaultHistoryLimit ? undefined : nextLimit,
    });
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput("");
  };

  const handleExport = async () => {
    if (exporting) return;

    setExporting(true);
    try {
      const { blob, filename, truncated, total } =
        await exportServiceHistory(filterParams);
      downloadBlob(blob, filename);
      if (truncated) {
        toast.warning(
          `Hanya 5.000 dari ${total?.toLocaleString("id-ID") ?? "banyak"} baris yang diekspor. Persempit filter untuk mengekspor sisanya.`,
          8000,
        );
      } else {
        toast.success("Riwayat servis berhasil diekspor.");
      }
    } catch (exportError) {
      toast.error(
        exportError.message || "Gagal mengekspor riwayat servis.",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleViewReport = (item) => {
    if (!item.report) return;
    setSelectedItem(null);
    setReportTarget({ taskId: item.task.id, reportId: item.report.id });
  };

  const hasActiveFilters = Boolean(
    search || filterKeys.some((key) => filters[key]),
  );

  const emptyMessage = hasActiveFilters
    ? "Tidak ada riwayat servis yang cocok dengan filter saat ini."
    : "Belum ada tugas selesai untuk ditampilkan.";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-bold text-slate-900">
            Service History
          </h1>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Riwayat tugas selesai, laporan servis, dan bukti pekerjaan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
            {loading && history.length > 0 && (
              <LoaderCircle className="h-4 w-4 animate-spin text-[#0EA5E9]" />
            )}
            {pagination?.total ?? history.length} tugas selesai
          </span>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </button>
        </div>
      </div>

      <ServiceHistoryFilterBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filters={filters}
        selectedClient={filters.clientId ? selectedClient : null}
        onClientChange={handleClientChange}
        assets={assets}
        assetsLoading={assetsLoading}
        divisions={divisions}
        technicians={technicians}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={refetch}
            className="self-start rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-rose-100 sm:self-auto"
          >
            Coba lagi
          </button>
        </div>
      )}

      <div
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        aria-busy={loading}
      >
        {loading && history.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#0EA5E9]" />
            Memuat riwayat servis...
          </div>
        ) : (
          <>
            <ServiceHistoryTable
              history={history}
              emptyMessage={emptyMessage}
              onSelect={setSelectedItem}
              onViewReport={handleViewReport}
            />
            <ServiceHistoryCardList
              history={history}
              emptyMessage={emptyMessage}
              onSelect={setSelectedItem}
            />
            {history.length > 0 && (
              <DataPagination
                pagination={pagination}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                loading={loading}
                itemLabel="tugas"
              />
            )}
          </>
        )}
      </div>

      <ServiceHistoryDetailDialog
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onViewReport={handleViewReport}
      />

      <TaskReportDetailDialog
        open={Boolean(reportTarget)}
        taskId={reportTarget?.taskId}
        reportId={reportTarget?.reportId}
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
}
