import { useEffect, useState } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useDivisions } from "../../hooks/useDivisions";
import {
  priorityLabels,
  priorityOptions,
} from "../../constants/taskConstants";
import { getClientById } from "../../services/clientService";
import { updateTask } from "../../services/taskService";
import { formatPriority, formatStatus } from "../../utils/formatters";
import { formatTaskId } from "../../utils/formatTaskId";
import { ClientPicker } from "./ClientPicker";
import {
  TaskFormField,
  taskInputClassName,
} from "./TaskFormControls";

function TaskEditDialogContent({ task, onClose, onSaved, onDeleted }) {
  const { userProfile } = useAuth();
  const toast = useToast();
  const { divisions, loading: divisionsLoading, error: divisionsError } =
    useDivisions();

  const userRole =
    typeof userProfile?.role === "string" ? userProfile.role.toUpperCase() : "";
  const canEditFull =
    userRole === "SUPER_ADMIN" || userRole === "MANAGER_DIVISION";
  const isStaff = userRole === "STAFF";
  const isTechnician = userRole === "TECHNICIAN";
  const canDelete = canEditFull;
  const canEdit = canEditFull || isStaff || isTechnician;

  const [form, setForm] = useState({
    title: task.title || "",
    description: task.description || "",
    priority: task.priority || "MEDIUM",
    dueDate: task.due_date ? String(task.due_date).slice(0, 10) : "",
    divisionId: task.division?.id || "",
    clientId: task.client?.id || "",
    assetId: task.asset?.id || "",
  });
  const [selectedClient, setSelectedClient] = useState(task.client || null);
  const [clientAssets, setClientAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const busy = saving || deleting;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose]);

  useEffect(() => {
    if (!canEditFull || !form.clientId) {
      setClientAssets([]);
      setAssetsLoading(false);
      setAssetError("");
      return undefined;
    }

    let cancelled = false;
    setAssetsLoading(true);
    setAssetError("");

    getClientById(form.clientId)
      .then((client) => {
        if (cancelled) return;
        const assets = Array.isArray(client?.assets) ? client.assets : [];
        setClientAssets(assets);
        setForm((previousForm) => {
          if (!previousForm.assetId) return previousForm;
          return assets.some((asset) => asset.id === previousForm.assetId)
            ? previousForm
            : { ...previousForm, assetId: "" };
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setClientAssets([]);
        setAssetError(
          error.response?.data?.message ||
            error.message ||
            "Gagal memuat aset klien.",
        );
      })
      .finally(() => {
        if (!cancelled) setAssetsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canEditFull, form.clientId]);

  const updateField = (field, value) => {
    setForm((previousForm) => ({ ...previousForm, [field]: value }));
    setErrors((previousErrors) => ({ ...previousErrors, [field]: "" }));
    setSubmitError("");
  };

  const handleClientChange = (client) => {
    setSelectedClient(client);
    setForm((previousForm) => ({
      ...previousForm,
      clientId: client?.id || "",
      assetId: "",
    }));
    setErrors((previousErrors) => ({ ...previousErrors, clientId: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = {};

    if (canEditFull && !form.title.trim())
      nextErrors.title = "Judul tiket wajib diisi.";
    if (
      (canEditFull || isTechnician) &&
      !form.description.trim()
    )
      nextErrors.description = "Deskripsi masalah wajib diisi.";
    if (canEditFull && !form.divisionId)
      nextErrors.divisionId = "Divisi penanggung jawab wajib dipilih.";
    if (canEditFull && !form.clientId)
      nextErrors.clientId = "Klien wajib dipilih.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => {
    if (canEditFull) {
      return {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate || null,
        divisionId: form.divisionId,
        clientId: form.clientId,
        assetId: form.assetId || null,
      };
    }

    if (isStaff) {
      return {
        priority: form.priority,
        dueDate: form.dueDate || null,
      };
    }

    if (isTechnician) {
      return {
        description: form.description.trim(),
      };
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;

    setSubmitError("");
    if (!validate()) return;

    const payload = buildPayload();
    if (!payload) {
      setSubmitError("Peran Anda tidak memiliki izin untuk mengubah tiket.");
      return;
    }

    setSaving(true);

    try {
      const updatedTask = await updateTask(task.id, payload);
      toast.success("Tiket berhasil diperbarui.");
      onSaved?.(updatedTask);
      onClose();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Gagal memperbarui tiket.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;

    setSubmitError("");
    setDeleting(true);

    try {
      await updateTask(task.id, { deleted: true });
      toast.success("Tiket berhasil dihapus.");
      onClose();
      onDeleted?.();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Gagal menghapus tiket.";
      setSubmitError(message);
      toast.error(message);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget && !busy) onClose();
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
        aria-labelledby="edit-task-title"
        className="flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="edit-task-title"
                className="m-0 text-lg font-bold text-slate-900"
              >
                Edit Tiket
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {formatTaskId(task.id)}
              </span>
            </div>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Perbarui informasi tiket sesuai peran Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup form edit tiket"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {submitError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {submitError}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Tiket
              </p>
              <p className="m-0 mt-1 break-words text-sm font-semibold text-slate-800">
                {task.title || "Tanpa judul"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{formatStatus(task.status)}</span>
                <span aria-hidden="true">•</span>
                <span>{formatPriority(task.priority)}</span>
              </div>
            </div>

            {!canEdit && (
              <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Peran Anda tidak memiliki izin untuk mengubah tiket ini.
              </p>
            )}

            {canEditFull && (
              <>
                <TaskFormField
                  label="Judul tiket"
                  htmlFor="edit-task-title-field"
                  error={errors.title}
                >
                  <input
                    id="edit-task-title-field"
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    disabled={busy}
                    className={taskInputClassName}
                  />
                </TaskFormField>

                <TaskFormField
                  label="Deskripsi masalah"
                  htmlFor="edit-task-description"
                  error={errors.description}
                >
                  <textarea
                    id="edit-task-description"
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={4}
                    disabled={busy}
                    className={`${taskInputClassName} resize-y`}
                  />
                </TaskFormField>

                <TaskFormField
                  label="Divisi penanggung jawab"
                  htmlFor="edit-task-division"
                  error={errors.divisionId || divisionsError}
                >
                  <select
                    id="edit-task-division"
                    value={form.divisionId}
                    onChange={(event) =>
                      updateField("divisionId", event.target.value)
                    }
                    disabled={busy || divisionsLoading}
                    className={taskInputClassName}
                  >
                    <option value="">
                      {divisionsLoading ? "Memuat divisi..." : "Pilih divisi"}
                    </option>
                    {divisions.map((division) => (
                      <option key={division.id} value={division.id}>
                        {division.name}
                      </option>
                    ))}
                  </select>
                </TaskFormField>

                <TaskFormField label="Klien" error={errors.clientId}>
                  <ClientPicker
                    value={selectedClient}
                    onChange={handleClientChange}
                    disabled={busy}
                    error={Boolean(errors.clientId)}
                  />
                </TaskFormField>

                <TaskFormField
                  label="Aset klien"
                  htmlFor="edit-task-asset"
                  error={assetError}
                  hint={
                    selectedClient &&
                    !assetsLoading &&
                    clientAssets.length === 0
                      ? "Klien ini belum memiliki aset terdaftar."
                      : "Opsional. Pilih aset yang bermasalah jika relevan."
                  }
                >
                  <select
                    id="edit-task-asset"
                    value={form.assetId}
                    onChange={(event) =>
                      updateField("assetId", event.target.value)
                    }
                    disabled={
                      busy ||
                      !selectedClient ||
                      assetsLoading ||
                      !!assetError
                    }
                    className={taskInputClassName}
                  >
                    <option value="">
                      {assetsLoading ? "Memuat aset..." : "Tanpa aset"}
                    </option>
                    {clientAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                </TaskFormField>
              </>
            )}

            {isTechnician && (
              <>
                <p className="m-0 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  Sebagai teknisi, Anda hanya dapat memperbarui deskripsi
                  pekerjaan. Status diperbarui dari panel status di bawah detail
                  tiket.
                </p>
                <TaskFormField
                  label="Deskripsi masalah / pekerjaan"
                  htmlFor="edit-task-technician-description"
                  error={errors.description}
                >
                  <textarea
                    id="edit-task-technician-description"
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={5}
                    disabled={busy}
                    className={`${taskInputClassName} resize-y`}
                  />
                </TaskFormField>
              </>
            )}

            {isStaff && (
              <p className="m-0 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                Sebagai staff, Anda hanya dapat memperbarui prioritas dan
                tenggat tiket.
              </p>
            )}

            {canEdit && !isTechnician && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TaskFormField label="Prioritas" htmlFor="edit-task-priority">
                  <select
                    id="edit-task-priority"
                    value={form.priority}
                    onChange={(event) =>
                      updateField("priority", event.target.value)
                    }
                    disabled={busy}
                    className={taskInputClassName}
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabels[priority] || priority}
                      </option>
                    ))}
                  </select>
                </TaskFormField>

                <TaskFormField label="Tenggat" htmlFor="edit-task-due-date">
                  <input
                    id="edit-task-due-date"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      updateField("dueDate", event.target.value)
                    }
                    disabled={busy}
                    className={taskInputClassName}
                  />
                </TaskFormField>
              </div>
            )}

            {confirmDelete && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="m-0 text-sm font-semibold text-rose-800">
                  Hapus tiket ini?
                </p>
                <p className="m-0 mt-1 text-xs leading-relaxed text-rose-700">
                  Tiket akan dihapus secara soft delete dan tidak muncul lagi di
                  daftar tugas.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting && (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Ya, hapus tiket
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={busy}
                    className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              {canDelete && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus tiket
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy || !canEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function TaskEditDialog({ open, task, onClose, onSaved, onDeleted }) {
  if (!open || !task) return null;

  return (
    <TaskEditDialogContent
      key={task.id}
      task={task}
      onClose={onClose}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  );
}
