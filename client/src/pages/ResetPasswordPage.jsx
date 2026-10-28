import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Loading } from "../components/Loading";
import { FormField, formInputClassName } from "../components/ui/FormField";
import { updatePasswordService } from "../services/authService.js";

const MIN_PASSWORD_LENGTH = 8;

// Tautan reset dari email membuat sesi sementara (event PASSWORD_RECOVERY);
// halaman ini memakai sesi itu untuk menyimpan password baru.
export default function ResetPasswordPage() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loading />;

  if (!session) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl w-full">
        <h1 className="m-0 text-lg font-bold text-slate-900">
          Tautan tidak valid
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Tautan reset password tidak valid atau sudah kedaluwarsa. Minta
          administrator mengirim ulang tautan reset password.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-block text-sm font-semibold text-[#0284C7] hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setSubmitting(true);
    setError("");
    const { error: updateError } = await updatePasswordService(password);

    if (updateError) {
      console.error("Update password error:", updateError);
      setError(
        "Gagal menyimpan password baru. Tautan mungkin sudah kedaluwarsa.",
      );
      setSubmitting(false);
      return;
    }

    await signOut();
    navigate("/login?notice=password-updated", { replace: true });
  };

  return (
    <>
      {submitting && <Loading />}

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#0EA5E9] text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Atur password baru
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {session.user?.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormField label="Password baru" htmlFor="new-password">
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={formInputClassName}
            />
          </FormField>

          <FormField
            label="Ulangi password baru"
            htmlFor="confirm-password"
            error={error}
          >
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={formInputClassName}
            />
          </FormField>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-medium text-sm shadow-sm transition"
          >
            {submitting ? "Menyimpan..." : "Simpan password baru"}
          </button>
        </form>
      </div>
    </>
  );
}
