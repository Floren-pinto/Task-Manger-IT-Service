import { Link, useLocation } from "react-router-dom";
import {
  clientStatusLabels,
  clientStatusStyles,
} from "../../constants/clientConstants";
import { formatDate, isArchived } from "../../utils/formatters";

export function ClientTable({
  clients = [],
  emptyMessage = "Belum ada client untuk ditampilkan.",
}) {
  const location = useLocation();

  if (clients.length === 0) {
    return (
      <p className="hidden px-4 py-10 text-center text-sm text-slate-500 xl:block">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Client</th>
            <th className="px-4 py-3 font-semibold">Contact</th>
            <th className="px-4 py-3 font-semibold">Service</th>
            <th className="px-4 py-3 font-semibold">Address</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
            <th className="px-4 py-3 font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {clients.map((client) => {
            const status = isArchived(client) ? "archived" : "active";
            const clientPath = `/clients/${client.id}`;
            const linkState = { state: { backgroundLocation: location } };

            return (
              <tr
                key={client.id}
                className="align-top transition-colors hover:bg-slate-50/80"
              >
                <td className="px-4 py-4">
                  <Link
                    to={clientPath}
                    {...linkState}
                    className="block max-w-[260px] font-semibold text-slate-800 transition-colors hover:text-[#0EA5E9]"
                  >
                    {client.name || "Client tanpa nama"}
                  </Link>
                  <span className="mt-1 block truncate text-xs text-slate-400">
                    {client.email || "Email belum diisi"}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-slate-600">
                  {client.contact || "—"}
                </td>
                <td className="px-4 py-4 text-xs text-slate-600">
                  {client.service_type || "—"}
                </td>
                <td className="px-4 py-4 text-xs text-slate-600">
                  <span className="line-clamp-2 inline-block max-w-[240px]">
                    {client.address || "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${clientStatusStyles[status]}`}
                  >
                    {clientStatusLabels[status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                  {formatDate(client.updated_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <Link
                    to={clientPath}
                    {...linkState}
                    className="text-xs font-semibold text-[#0EA5E9] transition-colors hover:text-[#0284C7]"
                  >
                    Detail
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
