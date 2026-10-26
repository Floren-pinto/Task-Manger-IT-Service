import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, LoaderCircle, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useUsers } from "../hooks/useUsers";
import { useDivisions } from "../hooks/useDivisions";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useUserMutations } from "../hooks/useUserMutations";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { resetPassword } from "../services/userService";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { UserCardList } from "../components/users/UserCardList";
import { UserCreateDialog } from "../components/users/UserCreateDialog";
import { UserEditDialog } from "../components/users/UserEditDialog";
import { UserFilterBar } from "../components/users/UserFilterBar";
import { UserTable } from "../components/users/UserTable";
import { USER_ROLES } from "../constants/userConstants";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { divisions } = useDivisions();
  const { userProfile } = useAuth();
  const toast = useToast();
  const { updateUser, submitting } = useUserMutations();

  const search = (searchParams.get("search") || "").trim();

  const rawRole = (searchParams.get("role") || "").toUpperCase();
  const role = USER_ROLES.includes(rawRole) ? rawRole : "all";

  const rawDivision = searchParams.get("division") || "";
  const division =
    rawDivision === "all" || UUID_PATTERN.test(rawDivision)
      ? rawDivision || "all"
      : "all";

  const rawStatus = searchParams.get("status") || "";
  const status = ["active", "inactive"].includes(rawStatus)
    ? rawStatus
    : "all";

  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const queryParams = useMemo(() => {
    const params = {};

    if (search) params.search = search;
    if (role !== "all") params.role = role;
    if (division !== "all") params.division = division;
    if (status === "active") params.status = true;
    if (status === "inactive") params.status = false;
    if (includeDeleted) params.includeDeleted = true;

    return params;
  }, [division, includeDeleted, role, search, status]);

  const { users, loading, error, refetch } = useUsers(queryParams);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const updateFilters = useCallback(
    (updates) => {
      setSearchParams((previousParams) => {
        const nextParams = new URLSearchParams(previousParams);

        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "" || value === "all") {
            nextParams.delete(key);
          } else {
            nextParams.set(key, String(value));
          }
        });

        return nextParams;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim();
    if (normalizedSearch === search) return;
    updateFilters({ search: normalizedSearch });
  }, [debouncedSearch, search, updateFilters]);

  const hasActiveFilters = Boolean(
    search ||
      role !== "all" ||
      division !== "all" ||
      status !== "all" ||
      includeDeleted,
  );

  const emptyMessage = hasActiveFilters
    ? "Tidak ada pengguna yang cocok dengan filter saat ini."
    : "Belum ada pengguna untuk ditampilkan.";

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput("");
  };

  const handleActivate = async (user) => {
    try {
      await updateUser(user.id, { isActive: true });
      refetch();
    } catch {
      // Pesan error sudah ditampilkan oleh useUserMutations.
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    try {
      await updateUser(deactivateTarget.id, { isActive: false });
      setDeactivateTarget(null);
      refetch();
    } catch {
      // Pesan error sudah ditampilkan oleh useUserMutations.
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;

    try {
      await updateUser(archiveTarget.id, { deleted: true });
      setArchiveTarget(null);
      refetch();
    } catch {
      // Pesan error sudah ditampilkan oleh useUserMutations.
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;

    try {
      await updateUser(restoreTarget.id, { deleted: false, isActive: true });
      setRestoreTarget(null);
      refetch();
    } catch {
      // Pesan error sudah ditampilkan oleh useUserMutations.
    }
  };

  const handleResetPassword = async (user) => {
    const { error: resetError } = await resetPassword(user.email);

    if (resetError) {
      toast.error("Gagal mengirim email reset password. Coba lagi nanti.");
      return;
    }

    toast.success(
      "Jika email terdaftar, tautan reset password telah dikirim.",
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-bold text-slate-900">
            User Management
          </h1>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Kelola akun, role, divisi, dan status aktif pengguna.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
            {loading && users.length > 0 && (
              <LoaderCircle className="h-4 w-4 animate-spin text-[#0EA5E9]" />
            )}
            {users.length} pengguna
          </span>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7]"
          >
            <Plus className="h-4 w-4" />
            Tambah Pengguna
          </button>
        </div>
      </div>

      <UserFilterBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        role={role}
        onRoleChange={(value) => updateFilters({ role: value })}
        division={division}
        onDivisionChange={(value) => updateFilters({ division: value })}
        divisions={divisions}
        status={status}
        onStatusChange={(value) => updateFilters({ status: value })}
        includeDeleted={includeDeleted}
        onIncludeDeletedChange={(nextValue) =>
          updateFilters({
            includeDeleted: nextValue ? "true" : undefined,
          })
        }
        onClear={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={refetch}
            className="self-start rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-rose-100 sm:self-auto"
          >
            Coba lagi
          </button>
        </div>
      )}

      <div
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        aria-busy={loading}
      >
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#0EA5E9]" />
            Memuat pengguna...
          </div>
        ) : (
          <>
            <UserTable
              users={users}
              emptyMessage={emptyMessage}
              currentUserId={userProfile?.id}
              onEdit={setEditTarget}
              onDeactivate={setDeactivateTarget}
              onActivate={handleActivate}
              onArchive={setArchiveTarget}
              onRestore={setRestoreTarget}
              onResetPassword={handleResetPassword}
            />
            <UserCardList
              users={users}
              emptyMessage={emptyMessage}
              currentUserId={userProfile?.id}
              onEdit={setEditTarget}
              onDeactivate={setDeactivateTarget}
              onActivate={handleActivate}
              onArchive={setArchiveTarget}
              onRestore={setRestoreTarget}
              onResetPassword={handleResetPassword}
            />
          </>
        )}
      </div>

      <UserCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />

      <UserEditDialog
        open={Boolean(editTarget)}
        user={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Nonaktifkan pengguna?"
        description={`${deactivateTarget?.name || "Pengguna"} tidak akan bisa login atau memakai API sampai diaktifkan kembali.`}
        confirmLabel="Nonaktifkan"
        loading={submitting}
        onConfirm={handleConfirmDeactivate}
        onClose={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Arsipkan pengguna?"
        description={`${archiveTarget?.name || "Pengguna"} akan diarsipkan dan tidak bisa mengakses aplikasi. Riwayat tugas tetap tersimpan.`}
        confirmLabel="Arsipkan"
        loading={submitting}
        onConfirm={handleConfirmArchive}
        onClose={() => setArchiveTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Pulihkan pengguna?"
        description={`${restoreTarget?.name || "Pengguna"} akan diaktifkan kembali dan bisa mengakses aplikasi.`}
        confirmLabel="Pulihkan"
        variant="default"
        loading={submitting}
        onConfirm={handleConfirmRestore}
        onClose={() => setRestoreTarget(null)}
      />
    </div>
  );
}
