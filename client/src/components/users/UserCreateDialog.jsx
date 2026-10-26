import { useEffect, useState } from "react";
import { Eye, EyeOff, LoaderCircle, X } from "lucide-react";
import { useDivisions } from "../../hooks/useDivisions";
import { useUserMutations } from "../../hooks/useUserMutations";
import {
  USER_ROLES,
  divisionRequiredRoles,
  formatRole,
} from "../../constants/userConstants";
import { FormField, formInputClassName } from "../ui/FormField";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function UserCreateDialogContent({ onClose, onCreated }) {
  const { createUser, submitting } = useUserMutations();
  const {
    divisions,
    loading: divisionsLoading,
    error: divisionsError,
  } = useDivisions();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "TECHNICIAN",
    divisionId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

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
    if (!form.email.trim()) {
      nextErrors.email = "Email wajib diisi.";
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = "Format email tidak valid.";
    }
    if (form.password.length < 8) {
      nextErrors.password = "Password minimal 8 karakter.";
    }
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

    try {
      const createdUser = await createUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        divisionId: form.divisionId || null,
      });

      onCreated?.(createdUser);
      onClose();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Gagal membuat pengguna.",
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
        aria-labelledby="user-create-title"
        className="flex h-full w-full max-w-[540px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2
              id="user-create-title"
              className="m-0 text-lg font-bold text-slate-900"
            >
              Tambah Pengguna
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Buat akun baru beserta role dan divisinya.
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

            <FormField
              label="Nama lengkap"
              htmlFor="user-name"
              error={errors.name}
            >
              <input
                id="user-name"
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                maxLength={200}
                disabled={submitting}
                autoFocus
                autoComplete="name"
                className={formInputClassName}
              />
            </FormField>

            <FormField
              label="Email"
              htmlFor="user-email"
              error={errors.email}
              hint="Email dipakai untuk login dan tidak dapat diubah setelah dibuat."
            >
              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                disabled={submitting}
                autoComplete="email"
                className={formInputClassName}
              />
            </FormField>

            <FormField
              label="Password sementara"
              htmlFor="user-password"
              error={errors.password}
              hint="Minimal 8 karakter. Minta pengguna menggantinya setelah login."
            >
              <div className="relative">
                <input
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  disabled={submitting}
                  autoComplete="new-password"
                  className={`${formInputClassName} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  disabled={submitting}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </FormField>

            <FormField label="Role" htmlFor="user-role" error={errors.role}>
              <select
                id="user-role"
                value={form.role}
                onChange={(event) => updateField("role", event.target.value)}
                disabled={submitting}
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
              htmlFor="user-division"
              error={errors.divisionId}
              hint={
                divisionRequired
                  ? "Wajib untuk teknisi dan manager divisi."
                  : "Opsional untuk role ini."
              }
            >
              <select
                id="user-division"
                value={form.divisionId}
                onChange={(event) =>
                  updateField("divisionId", event.target.value)
                }
                disabled={submitting || divisionsLoading}
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
              Simpan Pengguna
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function UserCreateDialog({ open, onClose, onCreated }) {
  if (!open) return null;

  return <UserCreateDialogContent onClose={onClose} onCreated={onCreated} />;
}
