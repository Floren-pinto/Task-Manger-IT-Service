import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function MobileHeader() {
  const { user } = useAuth();
  const toast = useToast();

  return (
    <header className="md:hidden px-4 pt-4 pb-3 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between shadow-xs">
      <div>
        <span className="text-[10px] font-bold tracking-wider uppercase text-[#0EA5E9]">
          IT Ops Center
        </span>
        <h1 className="text-base font-bold text-slate-900 leading-tight m-0">TaskCore</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => toast.info('Tidak ada notifikasi baru.')}
          className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
          aria-label="Notifikasi"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        <img
          src={user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120'}
          alt={user?.name || 'User'}
          className="w-8 h-8 rounded-full ring-1 ring-slate-200 object-cover"
        />
      </div>
    </header>
  );
}
