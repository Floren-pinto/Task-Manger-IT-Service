import { Bell, Clock, RefreshCw, UserPlus } from "lucide-react";
import { formatDate, formatRelativeTime } from "../../utils/formatters";

const notificationTypeMeta = {
  ASSIGNMENT: {
    label: "Penugasan",
    icon: UserPlus,
    className: "bg-sky-50 text-[#0EA5E9]",
  },
  STATUS_CHANGE: {
    label: "Perubahan status",
    icon: RefreshCw,
    className: "bg-amber-50 text-amber-600",
  },
  DEADLINE_REMINDER: {
    label: "Pengingat deadline",
    icon: Clock,
    className: "bg-rose-50 text-rose-600",
  },
};

const fallbackTypeMeta = {
  label: "Notifikasi",
  icon: Bell,
  className: "bg-slate-100 text-slate-500",
};

export function NotificationItem({
  notification,
  isRead,
  onSelect,
  variant = "compact",
  role,
}) {
  const meta = notificationTypeMeta[notification.type] || fallbackTypeMeta;
  const Icon = meta.icon;
  const isCompact = variant === "compact";

  return (
    <button
      type="button"
      role={role}
      onClick={() => onSelect(notification)}
      className={`flex w-full items-start gap-3 text-left transition focus:outline-none focus-visible:bg-sky-50 ${
        isCompact ? "px-4 py-3" : "px-4 py-4 sm:px-5"
      } ${isRead ? "bg-white hover:bg-slate-50" : "bg-sky-50/40 hover:bg-sky-50"}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.className}`}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span
            className={`text-sm text-slate-900 ${
              isRead ? "font-medium" : "font-semibold"
            } ${isCompact ? "truncate" : ""}`}
          >
            {notification.title || meta.label}
          </span>
          {!isRead && (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0EA5E9]"
              aria-label="Belum dibaca"
            />
          )}
        </span>
        <span
          className={`mt-0.5 block text-xs text-slate-600 ${
            isCompact ? "line-clamp-2" : ""
          }`}
        >
          {notification.message}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
          <time
            dateTime={notification.created_at}
            title={formatDate(notification.created_at, true)}
          >
            {formatRelativeTime(notification.created_at)}
          </time>
          {!isCompact && (
            <>
              <span aria-hidden="true">·</span>
              <span>{meta.label}</span>
              <span aria-hidden="true">·</span>
              <span className={isRead ? "" : "font-semibold text-[#0284C7]"}>
                {isRead ? "Dibaca" : "Belum dibaca"}
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}
