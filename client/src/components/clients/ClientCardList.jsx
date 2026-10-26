import { ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  clientStatusLabels,
  clientStatusStyles,
} from "../../constants/clientConstants";
import { formatDate, isArchived } from "../../utils/formatters";

export function ClientCardList({
  clients = [],
  emptyMessage = "Belum ada client untuk ditampilkan.",
}) {
  const location = useLocation();

  if (clients.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-slate-500 xl:hidden">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid gap-3 p-4 xl:hidden">
      {clients.map((client) => {
        const status = isArchived(client) ? "archived" : "active";

        return (
          <Link
            key={client.id}
            to={`/clients/${client.id}`}
            state={{ backgroundLocation: location }}
            className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-sky-200 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-[#0EA5E9]">
                  {client.name || "Client tanpa nama"}
                </h3>
                <p className="mt-1 text-[11px] text-slate-400">
                  {client.service_type || "Service type belum diisi"}
                </p>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#0EA5E9]" />
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-500">
              {client.contact && (
                <p className="m-0 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{client.contact}</span>
                </p>
              )}
              {client.email && (
                <p className="m-0 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </p>
              )}
              <p className="m-0 flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">
                  {client.address || "Alamat belum diisi"}
                </span>
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${clientStatusStyles[status]}`}
              >
                {clientStatusLabels[status]}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatDate(client.updated_at)}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
