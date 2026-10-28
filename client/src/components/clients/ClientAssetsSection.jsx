import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  History,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { AssetFormDialog } from "./AssetFormDialog";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useAssetMutations } from "../../hooks/useAssetMutations";
import { isArchived } from "../../utils/formatters";

export function ClientAssetsSection({
  clientId,
  assets = [],
  canWrite = false,
  canArchive = false,
  canViewArchived = false,
  showArchived = false,
  onToggleArchived,
  onChanged,
}) {
  const { deleteAsset, restoreAsset, submitting } = useAssetMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const openCreateForm = () => {
    setEditingAsset(null);
    setFormOpen(true);
  };

  const openEditForm = (asset) => {
    setEditingAsset(asset);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteAsset(deleteTarget.id);
      setDeleteTarget(null);
      onChanged?.();
    } catch {
      setDeleteTarget(null);
    }
  };

  const handleRestore = async () => {
    try {
      await restoreAsset(restoreTarget.id);
      setRestoreTarget(null);
      onChanged?.();
    } catch {
      setRestoreTarget(null);
    }
  };

  return (
    <section className="border-b border-slate-100 px-5 py-5 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 aria-hidden="true" className="h-4 w-4 text-slate-400" />
          <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-400">
            Aset
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {assets.length}
          </span>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Aset
          </button>
        )}
      </div>

      {canViewArchived && (
        <label className="mb-3 flex w-fit items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => onToggleArchived?.(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#0EA5E9]"
          />
          Tampilkan aset arsip
        </label>
      )}

      {assets.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">
          Belum ada aset terdaftar untuk client ini.
        </p>
      ) : (
        <ul className="m-0 divide-y divide-slate-100 p-0">
          {assets.map((asset) => {
            const archived = isArchived(asset);

            return (
              <li
                key={asset.id}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="m-0 break-words text-sm font-medium text-slate-700">
                    {asset.name || "Aset tanpa nama"}
                  </p>
                  <p className="m-0 mt-0.5 break-words text-xs text-slate-500">
                    {[asset.type, asset.serial_number]
                      .filter(Boolean)
                      .join(" · ") || "Detail aset belum diisi"}
                  </p>
                  {archived && (
                    <span className="mt-1 inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      Arsip
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    to={`/service-history?clientId=${encodeURIComponent(clientId)}&assetId=${encodeURIComponent(asset.id)}`}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-[#0284C7]"
                    aria-label={`Riwayat servis aset ${asset.name || ""}`}
                    title="Riwayat servis"
                  >
                    <History className="h-3.5 w-3.5" />
                  </Link>

                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => openEditForm(asset)}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Edit aset ${asset.name || ""}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {canArchive && (
                    <>
                      {archived ? (
                        <button
                          type="button"
                          onClick={() => setRestoreTarget(asset)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Pulihkan aset ${asset.name || ""}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(asset)}
                          className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Arsipkan aset ${asset.name || ""}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AssetFormDialog
        open={formOpen}
        clientId={clientId}
        asset={editingAsset}
        onClose={() => setFormOpen(false)}
        onSaved={onChanged}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Arsipkan aset?"
        description="Aset akan diarsipkan dan tidak muncul lagi di pilihan aset task. Relasi task lama tetap tersimpan."
        confirmLabel="Arsipkan"
        loading={submitting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Pulihkan aset?"
        description="Aset akan muncul kembali di daftar aset aktif client ini."
        confirmLabel="Pulihkan"
        variant="default"
        loading={submitting}
        onConfirm={handleRestore}
        onClose={() => setRestoreTarget(null)}
      />
    </section>
  );
}
