import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Plus, RefreshCw, Search, X } from "lucide-react";
import { useUsers } from "../../hooks/useUsers";
import { personName } from "../../utils/formatters";

function getInitials(name) {
  if (typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function TechnicianPickerPanel({
  onSelect,
  assigning = false,
  assignedIds = [],
  onClose,
}) {
  const { users, loading, error, refetch } = useUsers({ role: "TECHNICIAN" });
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const assignedIdSet = useMemo(
    () => new Set(assignedIds.filter(Boolean)),
    [assignedIds],
  );

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return users
      .filter((user) => user.is_active !== false)
      .filter((user) => {
        if (!keyword) return true;
        const name = (user.name || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        return name.includes(keyword) || email.includes(keyword);
      });
  }, [users, query]);

  return (
    <div
      role="dialog"
      aria-label="Pilih teknisi"
      className="absolute right-0 top-full z-50 mt-2 w-[320px] max-w-[calc(100vw-2.5rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-400">
          Assign Teknisi
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pilihan teknisi"
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari teknisi berdasarkan nama atau email"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0EA5E9] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20"
        />
      </div>
      <p className="mb-0 mt-1 text-[11px] text-slate-400">
        Cari berdasarkan nama, spesialisasi, atau ketersediaan.
      </p>

      <div className="mt-3 max-h-64 overflow-y-auto overscroll-contain">
        {loading && (
          <div className="flex items-center justify-center gap-2 px-2 py-6 text-xs text-slate-400">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Memuat daftar teknisi...
          </div>
        )}

        {!loading && error && (
          <div className="px-2 py-6 text-center">
            <p className="m-0 text-xs leading-relaxed text-rose-600">{error}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              Coba lagi
            </button>
          </div>
        )}

        {!loading && !error && filteredUsers.length === 0 && (
          <p className="m-0 px-2 py-6 text-center text-xs leading-relaxed text-slate-500">
            {query.trim()
              ? `Teknisi dengan kata kunci "${query.trim()}" tidak ditemukan.`
              : "Belum ada teknisi yang tersedia."}
          </p>
        )}

        {!loading && !error && filteredUsers.length > 0 && (
          <ul className="mb-0 space-y-1 pl-0" role="listbox" aria-label="Daftar teknisi">
            {filteredUsers.map((user) => {
              const isAssigned = assignedIdSet.has(user.id);
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    disabled={isAssigned || assigning}
                    onClick={() => onSelect(user)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-100 text-[10px] font-bold text-sky-700">
                      {getInitials(user.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-slate-800">
                        {personName(user)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">
                        {user.email || "Teknisi"}
                      </span>
                    </span>
                    {isAssigned ? (
                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        Sudah ditugaskan
                      </span>
                    ) : (
                      <Plus
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0 text-slate-400"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AssignTechnicianDialog({
  onSelect,
  assigning = false,
  assignedIds = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = async (user) => {
    if (!onSelect) return;
    try {
      await onSelect(user);
      setIsOpen(false);
    } catch {
      // Error ditangani oleh parent melalui toast; panel tetap terbuka.
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0EA5E9] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#0284C7]"
      >
        <Plus className="h-3.5 w-3.5" />
        Assign Teknisi
      </button>

      {isOpen && (
        <TechnicianPickerPanel
          onSelect={handleSelect}
          assigning={assigning}
          assignedIds={assignedIds}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
