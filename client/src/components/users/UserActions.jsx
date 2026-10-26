import { KeyRound, Pencil, Power, RotateCcw, Trash2 } from "lucide-react";

const iconButtonClassName =
  "rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40";

export function UserActions({
  user,
  isSelf = false,
  onEdit,
  onDeactivate,
  onActivate,
  onArchive,
  onRestore,
  onResetPassword,
}) {
  const archived = Boolean(user.deleted_at);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onResetPassword?.(user)}
        className={`${iconButtonClassName} text-slate-500 hover:bg-slate-100 hover:text-slate-700`}
        aria-label={`Kirim reset password ke ${user.name || user.email}`}
        title="Kirim reset password"
      >
        <KeyRound className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onEdit?.(user)}
        className={`${iconButtonClassName} text-slate-500 hover:bg-slate-100 hover:text-slate-700`}
        aria-label={`Edit pengguna ${user.name || user.email}`}
        title="Edit pengguna"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {!archived && !isSelf && (
        <button
          type="button"
          onClick={() =>
            user.is_active ? onDeactivate?.(user) : onActivate?.(user)
          }
          className={`${iconButtonClassName} ${
            user.is_active
              ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
              : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
          }`}
          aria-label={
            user.is_active
              ? `Nonaktifkan ${user.name || user.email}`
              : `Aktifkan ${user.name || user.email}`
          }
          title={user.is_active ? "Nonaktifkan" : "Aktifkan"}
        >
          <Power className="h-3.5 w-3.5" />
        </button>
      )}

      {!isSelf &&
        (archived ? (
          <button
            type="button"
            onClick={() => onRestore?.(user)}
            className={`${iconButtonClassName} text-slate-500 hover:bg-slate-100 hover:text-slate-700`}
            aria-label={`Pulihkan ${user.name || user.email}`}
            title="Pulihkan pengguna"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onArchive?.(user)}
            className={`${iconButtonClassName} text-rose-500 hover:bg-rose-50 hover:text-rose-600`}
            aria-label={`Arsipkan ${user.name || user.email}`}
            title="Arsipkan pengguna"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ))}
    </div>
  );
}
