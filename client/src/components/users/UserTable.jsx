import {
  formatRole,
  roleStyles,
  userStatusKey,
  userStatusLabels,
  userStatusStyles,
} from "../../constants/userConstants";
import { formatDate } from "../../utils/formatters";

export function UserTable({
  users = [],
  emptyMessage = "Belum ada pengguna untuk ditampilkan.",
}) {
  if (users.length === 0) {
    return (
      <p className="hidden px-4 py-10 text-center text-sm text-slate-500 xl:block">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 font-semibold">Division</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => {
            const status = userStatusKey(user);

            return (
              <tr
                key={user.id}
                className="align-top transition-colors hover:bg-slate-50/80"
              >
                <td className="px-4 py-4">
                  <p className="m-0 max-w-[260px] font-semibold text-slate-800">
                    {user.name || "Pengguna tanpa nama"}
                  </p>
                  <span className="mt-1 block truncate text-xs text-slate-400">
                    {user.email || "Email tidak tersedia"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleStyles[user.role] || "border-slate-200 bg-slate-100 text-slate-600"}`}
                  >
                    {formatRole(user.role)}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-slate-600">
                  {user.division?.name || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${userStatusStyles[status]}`}
                  >
                    {userStatusLabels[status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                  {formatDate(user.updated_at, true)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
