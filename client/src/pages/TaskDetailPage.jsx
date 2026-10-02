import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  FileText,
  MapPin,
  Paperclip,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTaskDetail } from "../hooks/useTaskDetail";
import { useTask } from "../contexts/TaskContext.jsx";
import { Loading } from "../components/Loading";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { updateStatusTask } from "../services/taskService.js";

const statusUpdateRoles = new Set([
  "SUPER_ADMIN",
  "MANAGER_DIVISION",
  "TECHNICIAN",
]);

const availableStatuses = [
  "PENDING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];

const workflowSteps = [
  { id: "NEW", label: "Baru" },
  { id: "ASSIGNED", label: "Ditugaskan" },
  { id: "IN_PROGRESS", label: "Dikerjakan" },
  { id: "COMPLETED", label: "Selesai" },
];

const statusStep = {
  PENDING: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  ON_HOLD: 2,
  COMPLETED: 3,
  CANCELLED: -1,
};

const statusLabels = {
  PENDING: "Menunggu",
  ASSIGNED: "Ditugaskan",
  IN_PROGRESS: "Dikerjakan",
  ON_HOLD: "Tertahan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const statusStyles = {
  PENDING: "border-orange-200 bg-orange-50 text-orange-600",
  ASSIGNED: "border-slate-200 bg-slate-100 text-slate-700",
  IN_PROGRESS: "border-green-200 bg-green-50 text-green-700",
  ON_HOLD: "border-orange-200 bg-orange-50 text-orange-700",
  COMPLETED: "border-slate-200 bg-slate-50 text-slate-500",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

const priorityStyles = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-50 text-sky-700",
  HIGH: "bg-orange-50 text-orange-700",
  URGENT: "bg-orange-50 text-orange-600",
};

function formatDate(value, includeTime = false) {
  if (!value) return "Belum tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";

  return new Intl.DateTimeFormat(
    "id-ID",
    includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" },
  ).format(date);
}

function formatStatus(status) {
  return statusLabels[status] || status || "Status tidak tersedia";
}

function personName(person) {
  if (typeof person === "string") return person;
  return person?.name || person?.email || "Nama tidak tersedia";
}

function DetailSection({ icon: Icon, title, children, className = "" }) {
  return (
    <section
      className={`border-b border-slate-100 px-5 py-5 sm:px-6 ${className}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon aria-hidden="true" className="h-4 w-4 text-slate-400" />
        <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-400">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [statusUpdate, setStatusUpdate] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const returnTo = location.state?.backgroundLocation || "/dashboard";
  const taskId = params.taskId || params.id;
  const { task, loading, error } = useTaskDetail(taskId);
  const userRole =
    typeof userProfile?.role === "string" ? userProfile.role.toUpperCase() : "";
  const canUpdateStatus = statusUpdateRoles.has(userRole);
  const { updateTaskLocally } = useTask();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      navigate(returnTo, { replace: true });
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error || !task) {
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-slate-900/30"
        onClick={handleBackdropClick}
        role="presentation"
      >
        <section
          role="alert"
          className="flex h-full w-full max-w-[540px] flex-col border-l border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
        >
          <Link
            to={returnTo}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0284C7]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Kembali ke daftar tugas
          </Link>
          <h1 className="m-0 text-base font-bold text-rose-800">
            Detail tugas tidak tersedia
          </h1>
          <p className="mb-0 mt-2 text-sm text-rose-800">
            {error ||
              "Tugas tidak ditemukan atau Anda tidak memiliki akses untuk melihatnya."}
          </p>
        </section>
      </div>
    );
  }

  const status = task.status || "";
  const displayedStatus =
    statusUpdate?.taskId === taskId ? statusUpdate.status : status;
  const selectedStatus =
    statusUpdate?.taskId === taskId
      ? statusUpdate.selectedStatus
      : displayedStatus;
  const assignments = Array.isArray(task.assignments) ? task.assignments : [];
  const stepIndex =
    displayedStatus === "PENDING" && assignments.length > 0
      ? 1
      : (statusStep[displayedStatus] ?? 0);
  const attachments = Array.isArray(task.attachments) ? task.attachments : [];
  const histories = Array.isArray(task.histories) ? task.histories : [];
  const reports = Array.isArray(task.reports) ? task.reports : [];
  const activity = [
    ...histories.map((item) => ({
      id: item.id,
      date: item.changed_at,
      title: `${formatStatus(item.new_status)}${
        item.old_status ? ` (dari ${formatStatus(item.old_status)})` : ""
      }`,
      description: `Status diperbarui oleh ${personName(item.user)}`,
    })),
    ...reports.map((item) => ({
      id: item.id,
      date: item.created_at,
      title: item.summary || "Laporan layanan dibuat",
      description: item.action_taken || "Tindakan belum dicatat.",
    })),
  ].sort(
    (first, second) =>
      new Date(second.date || 0).getTime() -
      new Date(first.date || 0).getTime(),
  );
  const clientAddress = task.client?.address || "Alamat klien tidak tersedia";
  const assetName = task.asset?.name || "Informasi aset tidak tersedia";
  const imageAttachments = attachments.filter(
    (file) => file.file_type?.startsWith("image/") && file.file_url,
  );

  const handleStatusChange = (event) => {
    setStatusUpdate({
      taskId,
      status: displayedStatus,
      selectedStatus: event.target.value,
    });
    setStatusError("");
  };

  const handleStatusSubmit = async (event) => {
    event.preventDefault();
    if (
      !canUpdateStatus ||
      statusLoading ||
      selectedStatus === displayedStatus
    ) {
      return;
    }

    setStatusLoading(true);
    setStatusError("");
    try {
      const updatedTask = await updateStatusTask(taskId, selectedStatus);
      const nextStatus = updatedTask?.status || selectedStatus;
      setStatusUpdate({
        taskId,
        status: nextStatus,
        selectedStatus: nextStatus,
      });
      updateTaskLocally(taskId, { status: nextStatus });

      showSuccessToast("Status tugas berhasil diperbarui");
    } catch (err) {
      showErrorToast("Gagal memperbarui status tugas. Silakan coba lagi.");
      setStatusError(
        err.response?.data?.message ||
          err.message ||
          "Gagal memperbarui status tugas. Silakan coba lagi.",
      );
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 max-md:bg-slate-50"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Detail tugas"
        className="flex h-full w-full max-w-[540px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="shrink-0 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="break-all text-xs font-bold text-slate-500">
                {task.id || taskId || "Ticket ID tidak tersedia"}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[displayedStatus] || "border-slate-200 bg-slate-100 text-slate-700"}`}
              >
                {formatStatus(displayedStatus)}
              </span>
            </div>
            <Link
              to={returnTo}
              aria-label="Tutup detail tugas"
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <h1 className="mb-0 mt-4 break-words text-xl font-bold leading-snug text-slate-900">
            {task.title || "Tugas tanpa judul"}
          </h1>
          <p className="mb-0 mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="break-words">
              {task.client?.name || "Klien tidak tersedia"}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-bold ${priorityStyles[task.priority] || "bg-slate-100 text-slate-600"}`}
            >
              {task.priority || "Prioritas tidak tersedia"}
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {task.division?.name || "Divisi belum ditentukan"}
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
          <DetailSection icon={FileText} title="Deskripsi tugas">
            <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
              {task.description || "Belum ada deskripsi untuk tugas ini."}
            </p>
          </DetailSection>

          <DetailSection icon={CheckCircle2} title="Status pekerjaan">
            {displayedStatus === "CANCELLED" ? (
              <p className="m-0 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                Tugas ini telah dibatalkan.
              </p>
            ) : (
              <ol className="mb-0 flex list-none items-start p-0">
                {workflowSteps.map((step, index) => {
                  const complete = index < stepIndex;
                  const current = index === stepIndex;
                  return (
                    <li
                      key={step.id}
                      className="relative flex min-w-0 flex-1 flex-col items-center text-center"
                    >
                      {index < workflowSteps.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={`absolute left-1/2 top-3 h-0.5 w-full ${
                            index < stepIndex ? "bg-[#0EA5E9]" : "bg-slate-200"
                          }`}
                        />
                      )}
                      <span
                        className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          current
                            ? "border-[#0EA5E9] bg-sky-50 text-[#0284C7]"
                            : complete
                              ? "border-[#0EA5E9] bg-[#0EA5E9] text-white"
                              : "border-slate-200 bg-white text-slate-300"
                        }`}
                      >
                        {complete ? (
                          <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <Circle
                            aria-hidden="true"
                            className="h-2.5 w-2.5 fill-current"
                          />
                        )}
                      </span>
                      <span
                        className={`mt-2 px-0.5 text-[10px] font-medium sm:text-xs ${
                          current
                            ? "text-[#0284C7]"
                            : complete
                              ? "text-slate-600"
                              : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </DetailSection>

          <DetailSection icon={MapPin} title="Klien & aset">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Client Station
                </p>
                <p className="mb-0 mt-2 break-words text-sm font-semibold text-slate-800">
                  {task.client?.name || "Klien tidak tersedia"}
                </p>
                <p className="mb-0 mt-1 break-words text-xs leading-relaxed text-slate-500">
                  {clientAddress}
                </p>
                {task.client?.contact && (
                  <p className="mb-0 mt-2 break-words text-xs text-slate-500">
                    Kontak: {task.client.contact}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Equipment / Asset
                </p>
                <p className="mb-0 mt-2 break-words text-sm font-semibold text-slate-800">
                  {assetName}
                </p>
                <p className="mb-0 mt-1 break-words text-xs leading-relaxed text-slate-500">
                  {task.asset?.serial_number
                    ? `Serial: ${task.asset.serial_number}`
                    : task.asset?.type || "Detail aset tidak tersedia"}
                </p>
              </div>
            </div>
          </DetailSection>

          <DetailSection icon={UsersRound} title="Teknisi">
            {assignments.length > 0 ? (
              <ul className="mb-0 space-y-3 pl-0">
                {assignments.map((assignment, index) => (
                  <li
                    key={assignment.id || assignment.user?.id || index}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[#0284C7]">
                      <UserRound aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-semibold text-slate-800">
                        {personName(assignment.user)}
                      </p>
                      <p className="m-0 mt-0.5 truncate text-xs text-slate-400">
                        {assignment.user?.email || "Teknisi"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm leading-relaxed text-slate-500">
                Belum ada teknisi yang ditugaskan pada tugas ini.
              </p>
            )}
          </DetailSection>

          <DetailSection icon={CheckCircle2} title="Checklist pekerjaan">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
              <p className="m-0 text-sm leading-relaxed text-slate-500">
                Checklist pekerjaan belum tersedia pada data tugas. Gunakan
                deskripsi dan laporan layanan sebagai panduan pekerjaan.
              </p>
            </div>
          </DetailSection>

          <DetailSection icon={Paperclip} title="Bukti foto">
            {imageAttachments.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {imageAttachments.map((file, index) => (
                  <a
                    key={file.id || index}
                    href={file.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100"
                  >
                    <img
                      src={file.file_url}
                      alt={file.file_name || "Bukti foto tugas"}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-slate-900/60 px-2 py-1.5 text-[10px] text-white">
                      {file.file_name || "Bukti foto"}
                    </span>
                  </a>
                ))}
              </div>
            ) : attachments.length > 0 ? (
              <ul className="mb-0 space-y-2 pl-0">
                {attachments.map((file, index) => (
                  <li
                    key={file.id || index}
                    className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 p-3"
                  >
                    <FileText
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-slate-400"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                      {file.file_name || "Lampiran tanpa nama"}
                    </span>
                    {file.file_url && (
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Unduh ${file.file_name || "lampiran"}`}
                        className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0284C7]"
                      >
                        <Download aria-hidden="true" className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm leading-relaxed text-slate-500">
                Bukti foto belum tersedia untuk tugas ini.
              </p>
            )}
          </DetailSection>

          <DetailSection
            icon={Clock3}
            title="Activity log"
            className="border-b-0"
          >
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
              <div>
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Dibuat
                </p>
                <p className="mb-0 mt-1 text-xs font-medium text-slate-600">
                  {formatDate(task.created_at, true)}
                </p>
              </div>
              <div>
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Tenggat
                </p>
                <p className="mb-0 mt-1 text-xs font-medium text-slate-600">
                  {formatDate(task.due_date)}
                </p>
              </div>
            </div>
            {activity.length > 0 ? (
              <ol className="mb-0 space-y-0 pl-0">
                {activity.map((item, index) => (
                  <li
                    key={item.id || `${item.date}-${index}`}
                    className="relative flex gap-3 pb-4 last:pb-0"
                  >
                    {index < activity.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-[5px] top-3 h-full w-px bg-slate-200"
                      />
                    )}
                    <span className="relative mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-[#0EA5E9] bg-white" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:gap-2">
                        <p className="m-0 break-words text-xs font-semibold text-slate-700">
                          {item.title}
                        </p>
                        <time className="shrink-0 text-[10px] text-slate-400">
                          {formatDate(item.date, true)}
                        </time>
                      </div>
                      <p className="mb-0 mt-1 break-words text-xs leading-relaxed text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="m-0 text-sm leading-relaxed text-slate-500">
                Belum ada aktivitas tercatat selain pembuatan tugas.
              </p>
            )}
          </DetailSection>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white p-4 shadow-lg">
          {canUpdateStatus ? (
            <form
              onSubmit={handleStatusSubmit}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <label className="sr-only" htmlFor="task-status">
                Status tugas
              </label>
              <select
                id="task-status"
                value={selectedStatus}
                onChange={handleStatusChange}
                disabled={statusLoading}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#0EA5E9] disabled:opacity-60"
              >
                {!availableStatuses.includes(displayedStatus) && (
                  <option value={displayedStatus}>
                    {formatStatus(displayedStatus)}
                  </option>
                )}
                {availableStatuses.map((option) => (
                  <option key={option} value={option}>
                    {formatStatus(option)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={statusLoading || selectedStatus === displayedStatus}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0284C7] active:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                {statusLoading ? "Memperbarui..." : "Update Status"}
              </button>
            </form>
          ) : (
            <p className="m-0 text-center text-xs text-slate-500">
              Role Anda tidak memiliki izin untuk mengubah status tugas.
            </p>
          )}
          {statusError && (
            <p
              role="alert"
              className="mb-0 mt-2 text-xs font-medium text-rose-700"
            >
              {statusError}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
