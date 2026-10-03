import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Paperclip,
  UsersRound,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTaskDetail } from "../hooks/useTaskDetail";
import { useTask } from "../contexts/TaskContext";
import { Loading } from "../components/Loading";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { updateStatusTask } from "../services/taskService";
import { statusUpdateRoles } from "../constants/taskConstants";
import { useTaskActivity } from "../hooks/useTaskActivity";

import { TaskHeader } from "../components/tasks/TaskHeader";
import { TaskStatusWorkflow } from "../components/tasks/TaskStatusWorkflow";
import { TaskClientAssetSection } from "../components/tasks/TaskClientAssetSection";
import { TaskAssignmentsSection } from "../components/tasks/TaskAssignmentsSection";
import { TaskAttachmentsSection } from "../components/tasks/TaskAttachmentsSection";
import { TaskActivityLog } from "../components/tasks/TaskActivityLog";
import { TaskStatusForm } from "../components/tasks/TaskStatusForm";

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

export function TaskDetailPage() {
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
    typeof userProfile?.role === "string"
      ? userProfile.role.toUpperCase()
      : "";
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
  const attachments = Array.isArray(task.attachments) ? task.attachments : [];
  const histories = Array.isArray(task.histories) ? task.histories : [];
  const reports = Array.isArray(task.reports) ? task.reports : [];
  const activity = useTaskActivity(histories, reports);

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
        <TaskHeader
          task={task}
          taskId={taskId}
          displayedStatus={displayedStatus}
          returnTo={returnTo}
        />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
          <DetailSection icon={FileText} title="Deskripsi tugas">
            <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
              {task.description || "Belum ada deskripsi untuk tugas ini."}
            </p>
          </DetailSection>

          <DetailSection icon={CheckCircle2} title="Status pekerjaan">
            <TaskStatusWorkflow
              displayedStatus={displayedStatus}
              assignmentsCount={assignments.length}
            />
          </DetailSection>

          <DetailSection icon={MapPin} title="Klien & aset">
            <TaskClientAssetSection task={task} />
          </DetailSection>

          <DetailSection icon={UsersRound} title="Teknisi">
            <TaskAssignmentsSection assignments={assignments} />
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
            <TaskAttachmentsSection attachments={attachments} />
          </DetailSection>

          <DetailSection
            icon={Clock3}
            title="Activity log"
            className="border-b-0"
          >
            <TaskActivityLog
              activity={activity}
              createdAt={task.created_at}
              dueDate={task.due_date}
            />
          </DetailSection>
        </div>

        <TaskStatusForm
          canUpdateStatus={canUpdateStatus}
          selectedStatus={selectedStatus}
          displayedStatus={displayedStatus}
          statusLoading={statusLoading}
          statusError={statusError}
          onStatusChange={handleStatusChange}
          onStatusSubmit={handleStatusSubmit}
        />
      </section>
    </div>
  );
}
