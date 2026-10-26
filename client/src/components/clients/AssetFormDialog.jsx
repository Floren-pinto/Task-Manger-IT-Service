import { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { useAssetMutations } from "../../hooks/useAssetMutations";
import { FormField, formInputClassName } from "../ui/FormField";

function assetToForm(asset) {
  return {
    name: asset?.name ?? "",
    type: asset?.type ?? "",
    serialNumber: asset?.serial_number ?? "",
  };
}

function AssetFormDialogContent({ clientId, asset, onClose, onSaved }) {
  const { createAsset, updateAsset, submitting } = useAssetMutations();
  const [form, setForm] = useState(() => assetToForm(asset));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const isEditing = Boolean(asset?.id);

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

    if (!form.name.trim()) nextErrors.name = "Nama aset wajib diisi.";
    if (!form.type.trim()) nextErrors.type = "Tipe aset wajib diisi.";

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
      type: form.type.trim(),
      serialNumber: form.serialNumber.trim() || null,
    };

    try {
      if (isEditing) {
        await updateAsset(asset.id, payload);
      } else {
        await createAsset({ ...payload, clientId });
      }

      onSaved?.();
      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Gagal menyimpan data aset.",
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
        aria-labelledby="asset-form-title"
        className="flex h-full w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2
              id="asset-form-title"
              className="m-0 text-lg font-bold text-slate-900"
            >
              {isEditing ? "Edit Aset" : "Tambah Aset"}
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {isEditing
                ? "Perbarui data aset milik client ini."
                : "Daftarkan aset baru untuk client ini."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup form aset"
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

            <FormField label="Nama aset" htmlFor="asset-name" error={errors.name}>
              <input
                id="asset-name"
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
              label="Tipe aset"
              htmlFor="asset-type"
              error={errors.type}
              hint="Contoh: Laptop, Printer, Router."
            >
              <input
                id="asset-type"
                type="text"
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
                disabled={submitting}
                className={formInputClassName}
              />
            </FormField>

            <FormField
              label="Serial number"
              htmlFor="asset-serial-number"
              error={errors.serialNumber}
              hint="Opsional. Kosongkan bila tidak tersedia."
            >
              <input
                id="asset-serial-number"
                type="text"
                value={form.serialNumber}
                onChange={(event) =>
                  updateField("serialNumber", event.target.value)
                }
                disabled={submitting}
                className={formInputClassName}
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
              {isEditing ? "Simpan Perubahan" : "Simpan Aset"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function AssetFormDialog({
  open,
  clientId,
  asset = null,
  onClose,
  onSaved,
}) {
  if (!open) return null;

  return (
    <AssetFormDialogContent
      key={asset?.id ?? "new"}
      clientId={clientId}
      asset={asset}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
