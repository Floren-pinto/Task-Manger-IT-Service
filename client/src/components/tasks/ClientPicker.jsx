import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { useClients } from "../../hooks/useClients";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

export function ClientPicker({
  value,
  onChange,
  disabled = false,
  error = false,
  placeholder = "Cari nama klien...",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  const params = useMemo(() => {
    const search = debouncedQuery.trim();
    return search ? { search, limit: 10 } : { limit: 10 };
  }, [debouncedQuery]);

  const { clients, loading, error: loadError, refetch } = useClients(params);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (value) setOpen(false);
  }, [value]);

  const handleSelect = (client) => {
    onChange(client);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setOpen(false);
  };

  if (value) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2 ${
          error ? "border-rose-300" : "border-slate-300"
        }`}
      >
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-medium text-slate-800">
            {value.name || "Klien tanpa nama"}
          </p>
          <p className="m-0 mt-0.5 truncate text-xs text-slate-400">
            {value.contact || value.email || "Kontak belum tersedia"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ganti
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={error}
        className={`w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#0EA5E9] focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${
          error ? "border-rose-300" : "border-slate-300"
        }`}
      />

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-56 overflow-y-auto p-1">
            {loading && clients.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin text-[#0EA5E9]" />
                Mencari klien...
              </div>
            )}

            {!loading && loadError && (
              <div className="space-y-2 px-3 py-3 text-xs text-rose-600">
                <p className="m-0">{loadError}</p>
                <button
                  type="button"
                  onClick={refetch}
                  className="rounded-md border border-rose-300 px-2 py-1 font-semibold transition hover:bg-rose-50"
                >
                  Coba lagi
                </button>
              </div>
            )}

            {!loading &&
              !loadError &&
              clients.length === 0 && (
                <p className="m-0 px-3 py-4 text-xs text-slate-500">
                  {query.trim()
                    ? `Tidak ada klien yang cocok dengan "${query.trim()}".`
                    : "Belum ada klien yang dapat dipilih."}
                </p>
              )}

            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client)}
                className="block w-full rounded-lg px-3 py-2 text-left transition hover:bg-sky-50"
              >
                <span className="block truncate text-sm font-medium text-slate-700">
                  {client.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-400">
                  {client.contact || client.email || "Kontak belum tersedia"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
