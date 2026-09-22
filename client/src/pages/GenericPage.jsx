import React from 'react';
import { useToast } from '../contexts/ToastContext';

export default function GenericPage({ title, description }) {
  const toast = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">{title}</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">{description}</p>
        </div>
        <button
          onClick={() => toast.info(`Aksi pada halaman ${title}`)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition"
        >
          Notifikasi Uji
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-600">
          Halaman <strong className="text-slate-800">{title}</strong> sedang dalam konstruksi dan siap diisi dengan komponen UI spesifik.
        </p>
      </div>
    </div>
  );
}
