import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  History,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ClientAssetsSection } from "./ClientAssetsSection";
import { ClientFormDialog } from "./ClientFormDialog";
import { useAuth } from "../../contexts/AuthContext";
import { useClientDetail } from "../../hooks/useClientDetail";
import { useClientMutations } from "../../hooks/useClientMutations";
import {
  assetArchiveRoles,
  assetWriteRoles,
  clientCreateRoles,
  clientDeleteRoles,
  clientStatusLabels,
  clientStatusStyles,
} from "../../constants/clientConstants";
import { formatDate, isArchived } from "../../utils/formatters";

function DetailSection({ icon: Icon, title, children, className = "" }) {
  return (
    <section
      className={`border-b border-slate-100 px-5 py-5 sm:px-6 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon aria-hidden="true" className="h-4 w-4 text-slate-400" />
        <h2 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-400">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function DetailRow({ icon: Icon, children }) {
  return (
    <p className="m-0 flex items-start gap-2 text-sm text-slate-600">
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <span className="break-words">{children}</span>
    </p>
  );
}

export function ClientDetailDrawer() {
  const { clientId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { role: userRole } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [showArchivedAssets, setShowArchivedAssets] = useState(false);

  const canEdit = clientCreateRoles.has(userRole);
  const canManageArchive = clientDeleteRoles.has(userRole);
  const canViewArchivedAssets = canManageArchive;

  const { client, assets, loading, error, refetch } = useClientDetail(
    clientId,
    {
      includeDeletedAssets: canViewArchivedAssets && showArchivedAssets,
    },
  );
  const { deleteClient, restoreClient, submitting } = useClientMutations();

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const returnTo = location.state?.backgroundLocation || "/clients";
  const closeDrawer = () => navigate(returnTo, { replace: true });

  const archived = isArchived(client);
  const status = archived ? "archived" : "active";

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      closeDrawer();
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClient(client.id);
      setDeleteOpen(false);
      closeDrawer();
    } catch {
      setDeleteOpen(false);
    }
  };

  const handleRestore = async () => {
    try {
      await restoreClient(client.id);
      setRestoreOpen(false);
      refetch();
    } catch {
      setRestoreOpen(false);
    }
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-40 flex justify-end bg-slate-900/30"
        onClick={handleBackdropClick}
        role="presentation"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Detail client"
          aria-busy="true"
          className="flex h-full w-full max-w-[540px] items-center justify-center border-l border-slate-200 bg-white shadow-2xl"
        >
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#0EA5E9]" />
            Memuat detail client...
          </span>
        </section>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div
        className="fixed inset-0 z-40 flex justify-end bg-slate-900/30"
        onClick={handleBackdropClick}
        role="presentation"
      >
        <section
          role="alert"
          className="flex h-full w-full max-w-[540px] flex-col border-l border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
        >
          <Link
            to={returnTo}
            replace
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0284C7]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Kembali ke daftar client
          </Link>
          <h1 className="m-0 text-base font-bold text-rose-800">
            Detail client tidak tersedia
          </h1>
          <p className="mb-0 mt-2 text-sm text-rose-800">
            {error ||
              "Client tidak ditemukan atau Anda tidak memiliki akses untuk melihatnya."}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 max-md:bg-slate-50"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Detail client"
        className="flex h-full w-full max-w-[540px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="shrink-0 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeDrawer}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#0284C7]"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Kembali ke daftar client
            </button>

            <div className="flex items-center gap-1">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Edit client"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {canManageArchive && !archived && (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Arsipkan client"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              {canManageArchive && archived && (
                <button
                  type="button"
                  onClick={() => setRestoreOpen(true)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Pulihkan client"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="m-0 break-words text-lg font-bold text-slate-900">
              {client.name || "Client tanpa nama"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${clientStatusStyles[status]}`}
              >
                {clientStatusLabels[status]}
              </span>
              <span className="text-xs text-slate-500">
                {client.service_type || "Jenis layanan belum diisi"}
              </span>
            </div>
            {archived && (
              <p className="m-0 mt-2 text-xs text-slate-500">
                Client ini diarsipkan. Data task dan riwayat servis tetap
                tersimpan.
              </p>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <DetailSection icon={Phone} title="Kontak">
            <div className="space-y-2">
              <DetailRow icon={Phone}>
                {client.contact || "Kontak belum diisi"}
              </DetailRow>
              <DetailRow icon={Mail}>
                {client.email || "Email belum diisi"}
              </DetailRow>
            </div>
          </DetailSection>

          <DetailSection icon={MapPin} title="Alamat">
            <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
              {client.address || "Alamat belum diisi."}
            </p>
          </DetailSection>

          <DetailSection icon={CalendarClock} title="Metadata">
            <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p className="m-0">
                <span className="block text-[11px] uppercase tracking-wide text-slate-400">
                  Dibuat
                </span>
                {formatDate(client.created_at, true)}
              </p>
              <p className="m-0">
                <span className="block text-[11px] uppercase tracking-wide text-slate-400">
                  Diperbarui
                </span>
                {formatDate(client.updated_at, true)}
              </p>
            </div>
          </DetailSection>

          <ClientAssetsSection
            clientId={client.id}
            assets={assets}
            canWrite={assetWriteRoles.has(userRole)}
            canArchive={assetArchiveRoles.has(userRole)}
            canViewArchived={canViewArchivedAssets}
            showArchived={showArchivedAssets}
            onToggleArchived={setShowArchivedAssets}
            onChanged={refetch}
          />

          <div className="border-b-0 px-5 py-5 sm:px-6">
            <Link
              to={`/service-history?clientId=${encodeURIComponent(client.id)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-[#0284C7]"
            >
              <History className="h-4 w-4" />
              Riwayat Servis
            </Link>
            <p className="m-0 mt-2 text-xs text-slate-400">
              Lihat tugas selesai dan laporan servis untuk client ini.
            </p>
          </div>
        </div>
      </section>

      <ClientFormDialog
        open={editOpen}
        client={client}
        onClose={() => setEditOpen(false)}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Arsipkan client?"
        description="Client akan diarsipkan. Data task dan riwayat servis tetap tersimpan."
        confirmLabel="Arsipkan"
        loading={submitting}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />

      <ConfirmDialog
        open={restoreOpen}
        title="Pulihkan client?"
        description="Client akan muncul kembali di daftar aktif."
        confirmLabel="Pulihkan"
        variant="default"
        loading={submitting}
        onConfirm={handleRestore}
        onClose={() => setRestoreOpen(false)}
      />
    </div>
  );
}
