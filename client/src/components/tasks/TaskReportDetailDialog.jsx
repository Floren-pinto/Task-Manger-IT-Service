import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, LoaderCircle, Printer, X } from "lucide-react";
import { useServiceReport } from "../../hooks/useServiceReport";
import {
  formatDate,
  formatPriority,
  formatStatus,
  personName,
} from "../../utils/formatters";
import { formatTaskId } from "../../utils/formatTaskId";

function SnapshotField({ label, value }) {
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

function SnapshotBlock({ title, children }) {
  return (
    <section className="break-inside-avoid space-y-3 rounded-xl border border-slate-200 p-4">
      <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ServiceReportContent({ report }) {
  const snapshot = report?.snapshot_data ?? {};
  const task = snapshot.task ?? {};
  const technicians = Array.isArray(snapshot.technicians)
    ? snapshot.technicians
    : [];
  const statusHistory = Array.isArray(snapshot.status_history)
    ? snapshot.status_history
    : [];

  return (
    <div className="space-y-4 text-slate-700">
      <div>
        <p className="m-0 text-xs font-semibold text-[#0284C7]">
          {formatTaskId(task.id)}
        </p>
        <h3 className="m-0 mt-1 text-lg font-bold text-slate-900">
          {task.title || "Tugas tanpa judul"}
        </h3>
        <p className="m-0 mt-1 text-xs text-slate-500">
          Laporan dibuat {formatDate(report?.created_at, true)} oleh{" "}
          {personName(report?.createdBy)}
        </p>
      </div>

      <SnapshotBlock title="Laporan servis">
        <dl className="m-0 space-y-3">
          <SnapshotField label="Ringkasan" value={report?.summary} />
          <SnapshotField label="Tindakan" value={report?.action_taken} />
          <SnapshotField label="Catatan" value={report?.notes} />
        </dl>
      </SnapshotBlock>

      <SnapshotBlock title="Tugas">
        <dl className="m-0 grid grid-cols-2 gap-3">
          <SnapshotField label="Status" value={formatStatus(task.status)} />
          <SnapshotField
            label="Prioritas"
            value={formatPriority(task.priority)}
          />
          <SnapshotField
            label="Selesai"
            value={task.completed_at && formatDate(task.completed_at, true)}
          />
          <SnapshotField
            label="Tenggat"
            value={task.due_date && formatDate(task.due_date)}
          />
          <div className="col-span-2">
            <SnapshotField label="Deskripsi" value={task.description} />
          </div>
        </dl>
      </SnapshotBlock>

      <SnapshotBlock title="Klien & aset">
        <dl className="m-0 grid grid-cols-2 gap-3">
          <SnapshotField label="Klien" value={snapshot.client?.name} />
          <SnapshotField label="Kontak" value={snapshot.client?.contact} />
          <SnapshotField label="Email" value={snapshot.client?.email} />
          <SnapshotField
            label="Layanan"
            value={snapshot.client?.service_type}
          />
          <div className="col-span-2">
            <SnapshotField label="Alamat" value={snapshot.client?.address} />
          </div>
          <SnapshotField
            label="Aset"
            value={snapshot.asset?.name || "Tanpa aset"}
          />
          <SnapshotField
            label="Serial / tipe"
            value={[snapshot.asset?.serial_number, snapshot.asset?.type]
              .filter(Boolean)
              .join(" · ")}
          />
          <SnapshotField label="Divisi" value={snapshot.division?.name} />
        </dl>
      </SnapshotBlock>

      <SnapshotBlock title="Teknisi">
        {technicians.length > 0 ? (
          <ul className="m-0 list-none space-y-1 p-0 text-sm">
            {technicians.map((technician) => (
              <li key={technician.id}>
                {personName(technician)}
                {technician.email && (
                  <span className="text-slate-400"> · {technician.email}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-slate-500">
            Tidak ada teknisi tercatat.
          </p>
        )}
      </SnapshotBlock>

      <SnapshotBlock title="Riwayat status">
        {statusHistory.length > 0 ? (
          <ol className="m-0 list-none space-y-2 p-0 text-sm">
            {statusHistory.map((history, index) => (
              <li
                key={`${history.changed_at}-${index}`}
                className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3"
              >
                <span>
                  {formatStatus(history.old_status)} →{" "}
                  {formatStatus(history.new_status)}
                  {history.changed_by && (
                    <span className="text-slate-400">
                      {" "}
                      · {personName(history.changed_by)}
                    </span>
                  )}
                </span>
                <time className="shrink-0 text-xs text-slate-400">
                  {formatDate(history.changed_at, true)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 text-sm text-slate-500">
            Tidak ada riwayat status.
          </p>
        )}
      </SnapshotBlock>

      <p className="m-0 text-[11px] text-slate-400">
        Snapshot dibuat {formatDate(snapshot.generated_at, true)}.
      </p>
    </div>
  );
}

export function printServiceReport() {
  document.body.classList.add("printing-report");
  const cleanup = () => {
    document.body.classList.remove("printing-report");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

export function TaskReportDetailDialog({ open, taskId, reportId, onClose }) {
  if (!open || !reportId) return null;

  return (
    <TaskReportDetailDialogContent
      taskId={taskId}
      reportId={reportId}
      onClose={onClose}
    />
  );
}

function TaskReportDetailDialogContent({ taskId, reportId, onClose }) {
  const { report, loading, error, refetch } = useServiceReport({
    taskId,
    reportId,
  });

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
      className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-[1px]"
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
        className="flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2
              id="report-detail-title"
              className="m-0 text-lg font-bold text-slate-900"
            >
              Detail Laporan Servis
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Snapshot data tugas saat laporan dibuat.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup detail laporan"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading && !report ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin text-[#0EA5E9]" />
              Memuat laporan...
            </div>
          ) : error ? (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </span>
              <button
                type="button"
                onClick={refetch}
                className="self-start rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-rose-100"
              >
                Coba lagi
              </button>
            </div>
          ) : report ? (
            <ServiceReportContent report={report} />
          ) : null}
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={printServiceReport}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
        </footer>
      </section>

      {report &&
        createPortal(
          <div className="report-print-root p-8">
            <h1 className="m-0 mb-4 text-xl font-bold text-slate-900">
              Laporan Servis
            </h1>
            <ServiceReportContent report={report} />
          </div>,
          document.body,
        )}
    </div>
  );
}
