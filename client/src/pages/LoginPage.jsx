import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ShieldCheck, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    login();
    toast.success('Berhasil masuk ke IT Ops Center');
    navigate('/dashboard');
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl w-full">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 bg-[#0EA5E9] text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">IT Ops Center</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Sistem Manajemen Tiket & Penugasan Teknisi</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
          <input
            type="email"
            readOnly
            value="sarah.jenkins@itops.local"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99]"
        >
          <LogIn className="w-4 h-4" />
          Masuk ke Dashboard
        </button>
      </form>
    </div>
  );
}
