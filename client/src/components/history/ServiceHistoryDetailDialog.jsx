import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, Ticket, X } from "lucide-react";
import {
  formatAssetLabel,
  formatClientName,
  formatDate,
  formatPriority,
  technicianNames,
} from "../../utils/formatters";
import { formatTaskId } from "../../utils/formatTaskId";
import { ServiceReportBadge } from "./ServiceHistoryTable";

function DetailRow({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="m-0 mt-0.5 break-words text-sm text-slate-700">
        {value || "-"}
      </dd>
    </div>
  );
}

export function ServiceHistoryDetailDialog({ item, onClose, onViewReport }) {
  if (!item) return null;

  return (
    <ServiceHistoryDetailDialogContent
      item={item}
      onClose={onClose}
      onViewReport={onViewReport}
    />
  );
}

function ServiceHistoryDetailDialogContent({ item, onClose, onViewReport }) {
  const location = useLocation();
  const { task, report, client, asset, division, technicians } = item;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex justify-end bg-slate-900/40 backdrop-blur-[1px]"
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-detail-title"
        className="flex h-full w-full max-w-[540px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold text-[#0284C7]">
              {formatTaskId(task.id)}
            </p>
            <h2
              id="history-detail-title"
              className="m-0 mt-1 break-words text-lg font-bold text-slate-900"
            >
              {task.title}
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Selesai {formatDate(task.completed_at, true)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup detail riwayat"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <dl className="m-0 grid grid-cols-2 gap-4">
            <DetailRow
              label="Klien"
              value={client ? formatClientName(client) : null}
            />
            <DetailRow label="Aset" value={formatAssetLabel(asset)} />
            <DetailRow label="Divisi" value={division?.name} />
            <DetailRow label="Prioritas" value={formatPriority(task.priority)} />
            <div className="col-span-2">
              <DetailRow
                label="Teknisi"
                value={technicianNames(technicians)}
              />
            </div>
            <div className="col-span-2">
              <DetailRow label="Deskripsi" value={task.description} />
            </div>
          </dl>

          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-500">
                Laporan terbaru
              </h3>
              <ServiceReportBadge report={report} />
            </div>
            {report ? (
              <dl className="m-0 space-y-3">
                <DetailRow label="Ringkasan" value={report.summary} />
                <DetailRow label="Tindakan" value={report.action_taken} />
                <DetailRow label="Catatan" value={report.notes} />
                <DetailRow
                  label="Dibuat"
                  value={formatDate(report.created_at, true)}
                />
              </dl>
            ) : (
              <p className="m-0 text-sm text-slate-500">
                Tugas ini belum memiliki laporan servis.
              </p>
            )}
          </section>
        </div>

        <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <Link
            to={`/tasks/${task.id}`}
            state={{ backgroundLocation: location }}
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Ticket className="h-4 w-4" />
            Lihat tiket
          </Link>
          <button
            type="button"
            onClick={() => onViewReport(item)}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileText className="h-4 w-4" />
            Lihat & cetak laporan
          </button>
        </footer>
      </section>
    </div>
  );
}
