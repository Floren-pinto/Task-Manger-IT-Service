import { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { useClientMutations } from "../../hooks/useClientMutations";
import { FormField, formInputClassName } from "../ui/FormField";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientToForm(client) {
  return {
    name: client?.name ?? "",
    contact: client?.contact ?? "",
    email: client?.email ?? "",
    address: client?.address ?? "",
    serviceType: client?.service_type ?? "",
  };
}

function ClientFormDialogContent({ client, onClose, onSaved }) {
  const { createClient, updateClient, submitting } = useClientMutations();
  const [form, setForm] = useState(() => clientToForm(client));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const isEditing = Boolean(client?.id);

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

    if (!form.name.trim()) nextErrors.name = "Nama client wajib diisi.";
    if (!form.contact.trim())
      nextErrors.contact = "Kontak client wajib diisi.";
    if (!form.address.trim())
      nextErrors.address = "Alamat client wajib diisi.";
    if (!form.serviceType.trim())
      nextErrors.serviceType = "Jenis layanan wajib diisi.";
    if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = "Format email tidak valid.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitError("");
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      email: form.email.trim() || null,
      address: form.address.trim(),
      serviceType: form.serviceType.trim(),
    };

    try {
      if (isEditing) {
        await updateClient(client.id, payload);
      } else {
        await createClient(payload);
      }

      onSaved?.();
      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Gagal menyimpan data client.",
      );
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
        aria-labelledby="client-form-title"
        className="flex h-full w-full max-w-[540px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2
              id="client-form-title"
              className="m-0 text-lg font-bold text-slate-900"
            >
              {isEditing ? "Edit Client" : "Tambah Client"}
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {isEditing
                ? "Perbarui data pelanggan dan lokasi layanan."
                : "Catat pelanggan baru beserta lokasi layanannya."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup form client"
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

            <FormField label="Nama client" htmlFor="client-name" error={errors.name}>
              <input
                id="client-name"
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                maxLength={200}
                disabled={submitting}
                autoFocus
                className={formInputClassName}
              />
            </FormField>

            <FormField
              label="Kontak"
              htmlFor="client-contact"
              error={errors.contact}
              hint="Nomor telepon atau WhatsApp yang bisa dihubungi."
            >
              <input
                id="client-contact"
                type="text"
                value={form.contact}
                onChange={(event) => updateField("contact", event.target.value)}
                disabled={submitting}
                className={formInputClassName}
              />
            </FormField>

            <FormField
              label="Email"
              htmlFor="client-email"
              error={errors.email}
              hint="Opsional."
            >
              <input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                disabled={submitting}
                className={formInputClassName}
              />
            </FormField>

            <FormField
              label="Jenis layanan"
              htmlFor="client-service-type"
              error={errors.serviceType}
              hint="Contoh: Perawatan PC, Jaringan, atau Kontrak tahunan."
            >
              <input
                id="client-service-type"
                type="text"
                value={form.serviceType}
                onChange={(event) =>
                  updateField("serviceType", event.target.value)
                }
                disabled={submitting}
                className={formInputClassName}
              />
            </FormField>

            <FormField
              label="Alamat"
              htmlFor="client-address"
              error={errors.address}
            >
              <textarea
                id="client-address"
                value={form.address}
                onChange={(event) =>
                  updateField("address", event.target.value)
                }
                rows={3}
                disabled={submitting}
                className={`${formInputClassName} resize-y`}
              />
            </FormField>
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
              {isEditing ? "Simpan Perubahan" : "Simpan Client"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function ClientFormDialog({ open, client = null, onClose, onSaved }) {
  if (!open) return null;

  return (
    <ClientFormDialogContent
      key={client?.id ?? "new"}
      client={client}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
