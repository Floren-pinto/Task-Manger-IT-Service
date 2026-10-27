import { useEffect, useState } from "react";
import { AlertCircle, LoaderCircle, X } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { createTaskReport } from "../../services/serviceReportService";
import { reportTextMaxLength } from "../../constants/taskConstants";
import { FormField, formInputClassName } from "../ui/FormField";

const reportFields = [
  {
    name: "summary",
    label: "Ringkasan",
    placeholder: "Ringkasan pekerjaan yang diselesaikan",
    required: true,
  },
  {
    name: "actionTaken",
    label: "Tindakan",
    placeholder: "Tindakan teknis yang dilakukan",
    required: true,
  },
  {
    name: "notes",
    label: "Catatan (opsional)",
    placeholder: "Rekomendasi atau catatan tambahan",
    required: false,
  },
];

export function TaskReportDialog({ open, taskId, onClose, onCreated }) {
  if (!open) return null;

  return (
    <TaskReportDialogContent
      taskId={taskId}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}

function TaskReportDialogContent({ taskId, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ summary: "", actionTaken: "", notes: "" });
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

  const updateField = (field, value) => {
    setForm((previousForm) => ({ ...previousForm, [field]: value }));
    setErrors((previousErrors) => ({ ...previousErrors, [field]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = {};

    reportFields.forEach(({ name, label, required }) => {
      const value = form[name].trim();
      if (required && !value) {
        nextErrors[name] = `${label} wajib diisi.`;
      } else if (value.length > reportTextMaxLength) {
        nextErrors[name] = `Maksimal ${reportTextMaxLength} karakter.`;
      }
    });

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
      const report = await createTaskReport(taskId, {
        summary: form.summary.trim(),
        actionTaken: form.actionTaken.trim(),
        notes: form.notes.trim() || null,
      });

      toast.success("Laporan servis berhasil dibuat.");
      onCreated?.(report);
      onClose();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Gagal membuat laporan servis.";
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
        aria-labelledby="report-create-title"
        className="flex h-full w-full max-w-[540px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2
              id="report-create-title"
              className="m-0 text-lg font-bold text-slate-900"
            >
              Buat Laporan Servis
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Laporan bersifat final. Koreksi dilakukan dengan laporan baru.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup form laporan"
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
                className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {submitError}
              </div>
            )}

            {reportFields.map(({ name, label, placeholder }) => (
              <FormField
                key={name}
                label={label}
                htmlFor={`report-${name}`}
                error={errors[name]}
                hint={`${form[name].trim().length}/${reportTextMaxLength} karakter`}
              >
                <textarea
                  id={`report-${name}`}
                  rows={name === "notes" ? 3 : 4}
                  value={form[name]}
                  onChange={(event) => updateField(name, event.target.value)}
                  placeholder={placeholder}
                  maxLength={reportTextMaxLength}
                  disabled={submitting}
                  aria-invalid={Boolean(errors[name])}
                  className={`${formInputClassName} resize-y`}
                />
              </FormField>
            ))}
          </div>

          <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Simpan Laporan
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
