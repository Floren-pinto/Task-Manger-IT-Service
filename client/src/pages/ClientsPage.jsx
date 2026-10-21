import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, LoaderCircle, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useClients } from "../hooks/useClients";
import { useClientsChanged } from "../hooks/useClientsChanged";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { ClientCardList } from "../components/clients/ClientCardList";
import { ClientFilterBar } from "../components/clients/ClientFilterBar";
import { ClientFormDialog } from "../components/clients/ClientFormDialog";
import { ClientTable } from "../components/clients/ClientTable";
import { DataPagination } from "../components/ui/DataPagination";
import {
  clientCreateRoles,
  clientDeleteRoles,
  defaultClientLimit,
} from "../constants/clientConstants";
import { pageSizeOptions } from "../constants/taskConstants";

export default function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { userProfile } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const rawPage = Number(searchParams.get("page"));
  const page = Number.isFinite(rawPage)
    ? Math.max(Math.floor(rawPage), 1)
    : 1;
  const rawLimit = Number(searchParams.get("limit"));
  const limit = pageSizeOptions.includes(rawLimit)
    ? rawLimit
    : defaultClientLimit;
  const search = (searchParams.get("search") || "").trim();

  const userRole =
    typeof userProfile?.role === "string"
      ? userProfile.role.toUpperCase()
      : "";
  const canIncludeDeleted = clientDeleteRoles.has(userRole);
  const canCreate = clientCreateRoles.has(userRole);
  const includeDeleted =
    canIncludeDeleted && searchParams.get("includeDeleted") === "true";

  const queryParams = useMemo(() => {
    const params = { page, limit };

    if (search) params.search = search;
    if (includeDeleted) params.includeDeleted = true;

    return params;
  }, [includeDeleted, limit, page, search]);

  const { clients, pagination, loading, error, refetch } =
    useClients(queryParams);

  useClientsChanged(refetch);

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
    const normalizedSearch = debouncedSearch.trim();
    if (normalizedSearch === search) return;
    updateFilters({ search: normalizedSearch });
  }, [debouncedSearch, search, updateFilters]);

  const handleIncludeDeletedChange = (nextValue) => {
    updateFilters({ includeDeleted: nextValue ? "true" : undefined });
  };

  const handlePageChange = (nextPage) => {
    updateFilters({ page: nextPage > 1 ? nextPage : undefined });
  };

  const handleLimitChange = (nextLimit) => {
    updateFilters({
      limit: nextLimit === defaultClientLimit ? undefined : nextLimit,
    });
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput("");
  };

  const hasActiveFilters = Boolean(
    search || includeDeleted || page > 1 || limit !== defaultClientLimit,
  );

  const hasSearchFilters = Boolean(search);

  const emptyMessage = hasSearchFilters
    ? "Tidak ada client yang cocok dengan filter saat ini."
    : "Belum ada client untuk ditampilkan.";

  const handleClientSaved = () => {
    if (page !== 1) {
      updateFilters({ page: undefined });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-bold text-slate-900">
            Clients &amp; Locations
          </h1>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Kelola data pelanggan, kontak, lokasi, dan aset yang terdaftar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
            {loading && clients.length > 0 && (
              <LoaderCircle className="h-4 w-4 animate-spin text-[#0EA5E9]" />
            )}
            {pagination?.total ?? clients.length} client
          </span>
          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7]"
            >
              <Plus className="h-4 w-4" />
              Tambah Client
            </button>
          )}
        </div>
      </div>

      <ClientFilterBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        includeDeleted={includeDeleted}
        onIncludeDeletedChange={handleIncludeDeletedChange}
        canIncludeDeleted={canIncludeDeleted}
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
        {loading && clients.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#0EA5E9]" />
            Memuat client...
          </div>
        ) : (
          <>
            <ClientTable clients={clients} emptyMessage={emptyMessage} />
            <ClientCardList clients={clients} emptyMessage={emptyMessage} />
            {pagination?.total > 0 && (
              <DataPagination
                pagination={pagination}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                loading={loading}
                itemLabel="client"
              />
            )}
          </>
        )}
      </div>

      <ClientFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={handleClientSaved}
      />
    </div>
  );
}
