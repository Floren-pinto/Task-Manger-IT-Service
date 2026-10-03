import React from "react";

export function TaskClientAssetSection({ task }) {
  const clientAddress = task.client?.address || "Alamat klien tidak tersedia";
  const assetName = task.asset?.name || "Informasi aset tidak tersedia";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Client Station
        </p>
        <p className="mb-0 mt-2 break-words text-sm font-semibold text-slate-800">
          {task.client?.name || "Klien tidak tersedia"}
        </p>
        <p className="mb-0 mt-1 break-words text-xs leading-relaxed text-slate-500">
          {clientAddress}
        </p>
        {task.client?.contact && (
          <p className="mb-0 mt-2 break-words text-xs text-slate-500">
            Kontak: {task.client.contact}
          </p>
        )}
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Equipment / Asset
        </p>
        <p className="mb-0 mt-2 break-words text-sm font-semibold text-slate-800">
          {assetName}
        </p>
        <p className="mb-0 mt-1 break-words text-xs leading-relaxed text-slate-500">
          {task.asset?.serial_number
            ? `Serial: ${task.asset.serial_number}`
            : task.asset?.type || "Detail aset tidak tersedia"}
        </p>
      </div>
    </div>
  );
}
