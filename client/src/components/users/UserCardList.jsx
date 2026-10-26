import { Mail } from "lucide-react";
import {
  formatRole,
  roleStyles,
  userStatusKey,
  userStatusLabels,
  userStatusStyles,
} from "../../constants/userConstants";
import { formatDate } from "../../utils/formatters";
import { UserActions } from "./UserActions";

export function UserCardList({
  users = [],
  emptyMessage = "Belum ada pengguna untuk ditampilkan.",
  currentUserId,
  onEdit,
  onDeactivate,
  onActivate,
  onArchive,
  onRestore,
  onResetPassword,
}) {
  if (users.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-slate-500 xl:hidden">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid gap-3 p-4 xl:hidden">
      {users.map((user) => {
        const status = userStatusKey(user);

        return (
          <article
            key={user.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="m-0 text-sm font-semibold text-slate-800">
                  {user.name || "Pengguna tanpa nama"}
                </h3>
                <p className="m-0 mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {user.email || "Email tidak tersedia"}
                  </span>
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleStyles[user.role] || "border-slate-200 bg-slate-100 text-slate-600"}`}
              >
                {formatRole(user.role)}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="m-0 text-[10px] uppercase tracking-wide text-slate-400">
                  Divisi
                </dt>
                <dd className="m-0 mt-0.5 text-slate-600">
                  {user.division?.name || "—"}
                </dd>
              </div>
              <div>
                <dt className="m-0 text-[10px] uppercase tracking-wide text-slate-400">
                  Status
                </dt>
                <dd className="m-0 mt-0.5">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${userStatusStyles[status]}`}
                  >
                    {userStatusLabels[status]}
                  </span>
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="m-0 text-[11px] text-slate-400">
                Diperbarui {formatDate(user.updated_at, true)}
              </p>
              <UserActions
                user={user}
                isSelf={user.id === currentUserId}
                onEdit={onEdit}
                onDeactivate={onDeactivate}
                onActivate={onActivate}
                onArchive={onArchive}
                onRestore={onRestore}
                onResetPassword={onResetPassword}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
