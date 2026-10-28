import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Loading } from "../components/Loading";
import { LogIn, ShieldCheck } from "lucide-react";

// ?notice=... dikirim interceptor API dan halaman reset password.
const NOTICES = {
  inactive: {
    tone: "error",
    text: "Sesi Anda diakhiri karena akun tidak aktif. Hubungi administrator.",
  },
  "password-updated": {
    tone: "success",
    text: "Password berhasil diubah. Silakan masuk dengan password baru.",
  },
};

export default function LoginPage() {
  const { signIn } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const notice = NOTICES[searchParams.get("notice")];

  // Setelah berhasil, PublicRoute mengarahkan ke halaman asal atau dashboard.
  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);

    if (result.success) {
      toast.success("Berhasil masuk ke IT Ops Center");
    } else {
      toast.error(result.error?.message || "Gagal masuk. Silakan coba lagi.");
    }
  };

  return (
    <>
      {submitting && <Loading />}

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 bg-[#0EA5E9] text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            IT Ops Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sistem Manajemen Tiket & Penugasan Teknisi
          </p>
        </div>

        {notice && (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
              notice.tone === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {notice.text}
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99]"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? "Memverifikasi..." : "Masuk ke Dashboard"}
          </button>
        </form>
      </div>
    </>
  );
}
