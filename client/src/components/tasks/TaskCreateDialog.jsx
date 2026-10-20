import { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { useDivisions } from "../../hooks/useDivisions";
import {
  priorityLabels,
  priorityOptions,
} from "../../constants/taskConstants";
import { getClientById } from "../../services/clientService";
import { createTask } from "../../services/taskService";
import { ClientPicker } from "./ClientPicker";

const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#0EA5E9] focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50";

function FormField({ label, htmlFor, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-slate-600"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="m-0 text-xs text-slate-400">{hint}</p>}
      {error && <p className="m-0 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function TaskCreateDialogContent({ onClose, onCreated }) {
  const toast = useToast();
  const { divisions, loading: divisionsLoading, error: divisionsError } =
    useDivisions();

  const [form, setForm] = useState({
    title: "",
    description: "",
    divisionId: "",
    clientId: "",
    assetId: "",
    priority: "MEDIUM",
    dueDate: "",
  });
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientAssets, setClientAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, submitting]);

  useEffect(() => {
    if (!form.clientId) {
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
  }, [form.clientId]);

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

    if (!form.title.trim()) nextErrors.title = "Judul tiket wajib diisi.";
    if (!form.description.trim())
      nextErrors.description = "Deskripsi masalah wajib diisi.";
    if (!form.divisionId)
      nextErrors.divisionId = "Divisi penanggung jawab wajib dipilih.";
    if (!form.clientId) nextErrors.clientId = "Klien wajib dipilih.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitError("");
    if (!validate()) return;

    setSubmitting(true);

    try {
      const createdTask = await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate || null,
        divisionId: form.divisionId,
        clientId: form.clientId,
        assetId: form.assetId || null,
      });

      toast.success("Tiket berhasil dibuat.");
      onCreated?.(createdTask);
      onClose();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Gagal membuat tiket.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget && !submitting) onClose();
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
        aria-labelledby="create-task-title"
        className="flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2
              id="create-task-title"
              className="m-0 text-lg font-bold text-slate-900"
            >
              Tambah Tiket
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Catat permintaan layanan baru untuk klien.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup form tambah tiket"
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

            <FormField label="Judul tiket" htmlFor="task-title" error={errors.title}>
              <input
                id="task-title"
                type="text"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Contoh: Laptop tidak dapat terhubung ke jaringan"
                disabled={submitting}
                autoFocus
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Deskripsi masalah"
              htmlFor="task-description"
              error={errors.description}
            >
              <textarea
                id="task-description"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Jelaskan gejala, lokasi, dan informasi yang sudah dicoba..."
                rows={4}
                disabled={submitting}
                className={`${inputClassName} resize-y`}
              />
            </FormField>

            <FormField
              label="Divisi penanggung jawab"
              htmlFor="task-division"
              error={errors.divisionId || divisionsError}
            >
              <select
                id="task-division"
                value={form.divisionId}
                onChange={(event) =>
                  updateField("divisionId", event.target.value)
                }
                disabled={submitting || divisionsLoading}
                className={inputClassName}
              >
                <option value="">
                  {divisionsLoading
                    ? "Memuat divisi..."
                    : divisions.length === 0
                      ? "Belum ada divisi"
                      : "Pilih divisi"}
                </option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Klien" error={errors.clientId}>
              <ClientPicker
                value={selectedClient}
                onChange={handleClientChange}
                disabled={submitting}
                error={Boolean(errors.clientId)}
              />
            </FormField>

            <FormField
              label="Aset klien"
              htmlFor="task-asset"
              error={assetError}
              hint={
                selectedClient && !assetsLoading && clientAssets.length === 0
                  ? "Klien ini belum memiliki aset terdaftar."
                  : "Opsional. Pilih aset yang bermasalah jika relevan."
              }
            >
              <select
                id="task-asset"
                value={form.assetId}
                onChange={(event) => updateField("assetId", event.target.value)}
                disabled={
                  submitting || !selectedClient || assetsLoading || !!assetError
                }
                className={inputClassName}
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
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Prioritas" htmlFor="task-priority">
                <select
                  id="task-priority"
                  value={form.priority}
                  onChange={(event) =>
                    updateField("priority", event.target.value)
                  }
                  disabled={submitting}
                  className={inputClassName}
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabels[priority] || priority}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Tenggat" htmlFor="task-due-date">
                <input
                  id="task-due-date"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    updateField("dueDate", event.target.value)
                  }
                  disabled={submitting}
                  className={inputClassName}
                />
              </FormField>
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Simpan Tiket
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function TaskCreateDialog({ open, onClose, onCreated }) {
  if (!open) return null;

  return <TaskCreateDialogContent onClose={onClose} onCreated={onCreated} />;
}
