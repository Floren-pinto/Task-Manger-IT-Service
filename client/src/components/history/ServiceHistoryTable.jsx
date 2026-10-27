import { Link, useLocation } from "react-router-dom";
import { Eye, FileText, Ticket } from "lucide-react";
import {
  formatAssetLabel,
  formatClientName,
  formatDate,
  technicianNames,
} from "../../utils/formatters";
import { formatTaskId } from "../../utils/formatTaskId";

export function ServiceReportBadge({ report }) {
  return report ? (
    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      Ada laporan
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
      Belum ada
    </span>
  );
}

const actionClassName =
  "rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-[#0284C7]";

export function ServiceHistoryTable({
  history = [],
  emptyMessage,
  onSelect,
  onViewReport,
}) {
  const location = useLocation();

  if (history.length === 0) {
    return (
      <p className="hidden px-4 py-10 text-center text-sm text-slate-500 xl:block">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Tugas</th>
            <th className="px-4 py-3 font-semibold">Klien</th>
            <th className="px-4 py-3 font-semibold">Aset</th>
            <th className="px-4 py-3 font-semibold">Divisi</th>
            <th className="px-4 py-3 font-semibold">Teknisi</th>
            <th className="px-4 py-3 font-semibold">Selesai</th>
            <th className="px-4 py-3 font-semibold">Laporan</th>
            <th className="px-4 py-3 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {history.map((item) => (
            <tr
              key={item.task.id}
              className="align-top transition-colors hover:bg-slate-50/80"
            >
              <td className="px-4 py-4">
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="text-left"
                >
                  <span className="block text-xs font-bold text-slate-500">
                    {formatTaskId(item.task.id)}
                  </span>
                  <span className="mt-0.5 block font-semibold text-slate-800 hover:text-[#0284C7]">
                    {item.task.title}
                  </span>
                </button>
              </td>
              <td className="px-4 py-4 text-slate-600">
                {item.client
                  ? formatClientName(item.client)
                  : "Klien tidak tersedia"}
              </td>
              <td className="px-4 py-4 text-slate-600">
                {formatAssetLabel(item.asset)}
              </td>
              <td className="px-4 py-4 text-slate-600">
                {item.division?.name || "-"}
              </td>
              <td className="px-4 py-4 text-slate-600">
                {technicianNames(item.technicians)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                {formatDate(item.task.completed_at, true)}
              </td>
              <td className="px-4 py-4">
                <ServiceReportBadge report={item.report} />
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className={actionClassName}
                    aria-label={`Detail riwayat ${item.task.title}`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <Link
                    to={`/tasks/${item.task.id}`}
                    state={{ backgroundLocation: location }}
                    className={actionClassName}
                    aria-label={`Lihat tiket ${item.task.title}`}
                  >
                    <Ticket className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onViewReport(item)}
                    disabled={!item.report}
                    className={`${actionClassName} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                    aria-label={`Lihat laporan ${item.task.title}`}
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
