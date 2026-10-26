import { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useDivisions } from "../../hooks/useDivisions";
import { useUserMutations } from "../../hooks/useUserMutations";
import {
  USER_ROLES,
  divisionRequiredRoles,
  formatRole,
} from "../../constants/userConstants";
import { FormField, formInputClassName } from "../ui/FormField";

function userToForm(user) {
  return {
    name: user?.name ?? "",
    role: user?.role ?? "TECHNICIAN",
    divisionId: user?.division_id ?? "",
    isActive: Boolean(user?.is_active),
  };
}

function UserEditDialogContent({ user, onClose, onSaved }) {
  const { userProfile } = useAuth();
  const { updateUser, submitting } = useUserMutations();
  const {
    divisions,
    loading: divisionsLoading,
    error: divisionsError,
  } = useDivisions();

  const [form, setForm] = useState(() => userToForm(user));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const isSelf = userProfile?.id === user?.id;
  const archived = Boolean(user?.deleted_at);
  const divisionRequired = divisionRequiredRoles.has(form.role);

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

    if (!form.name.trim()) nextErrors.name = "Nama pengguna wajib diisi.";
    if (divisionRequired && !form.divisionId) {
      nextErrors.divisionId = "Divisi wajib dipilih untuk role ini.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitError("");
    if (!validate()) return;

    const cleanName = form.name.trim();
    const nextDivisionId = form.divisionId || null;
    const payload = {};

    if (cleanName !== user.name) payload.name = cleanName;

    if (!isSelf) {
      if (form.role !== user.role) payload.role = form.role;
      if (nextDivisionId !== (user.division_id || null)) {
        payload.divisionId = nextDivisionId;
      }
      if (form.isActive !== Boolean(user.is_active)) {
        payload.isActive = form.isActive;
      }
    }

    if (Object.keys(payload).length === 0) {
      setSubmitError("Tidak ada perubahan untuk disimpan.");
      return;
    }

    try {
      await updateUser(user.id, payload);
      onSaved?.();
      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Gagal memperbarui data pengguna.",
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
        aria-labelledby="user-edit-title"
        className="flex h-full w-full max-w-[540px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2
              id="user-edit-title"
              className="m-0 text-lg font-bold text-slate-900"
            >
              Edit Pengguna
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Perbarui profil, role, divisi, dan status akun.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup form pengguna"
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

            {isSelf && (
              <p className="m-0 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                Role, divisi, dan status akun sendiri tidak dapat diubah dari
                halaman ini.
              </p>
            )}

            {archived && (
              <p className="m-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Akun ini diarsipkan. Gunakan tombol Pulihkan untuk
                mengaktifkannya kembali.
              </p>
            )}

            <FormField
              label="Nama lengkap"
              htmlFor="user-edit-name"
              error={errors.name}
            >
              <input
                id="user-edit-name"
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
              label="Email"
              htmlFor="user-edit-email"
              hint="Email tidak dapat diubah."
            >
              <input
                id="user-edit-email"
                type="email"
                value={user.email || ""}
                disabled
                className={formInputClassName}
              />
            </FormField>

            <FormField label="Role" htmlFor="user-edit-role">
              <select
                id="user-edit-role"
                value={form.role}
                onChange={(event) => updateField("role", event.target.value)}
                disabled={submitting || isSelf}
                className={formInputClassName}
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Divisi"
              htmlFor="user-edit-division"
              error={errors.divisionId}
              hint={
                divisionRequired
                  ? "Wajib untuk teknisi dan manager divisi."
                  : "Opsional untuk role ini."
              }
            >
              <select
                id="user-edit-division"
                value={form.divisionId}
                onChange={(event) =>
                  updateField("divisionId", event.target.value)
                }
                disabled={submitting || isSelf || divisionsLoading}
                className={formInputClassName}
              >
                <option value="">
                  {divisionsLoading ? "Memuat divisi..." : "Tanpa divisi"}
                </option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </FormField>

            {divisionsError && (
              <p className="m-0 text-xs text-rose-600">{divisionsError}</p>
            )}

            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  updateField("isActive", event.target.checked)
                }
                disabled={submitting || isSelf || archived}
                className="h-4 w-4 rounded border-slate-300 accent-[#0EA5E9]"
              />
              <span className="text-sm text-slate-600">
                Akun aktif dan dapat mengakses aplikasi
              </span>
            </label>
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
              Simpan Perubahan
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function UserEditDialog({ open, user, onClose, onSaved }) {
  if (!open || !user) return null;

  return (
    <UserEditDialogContent
      key={user.id}
      user={user}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
