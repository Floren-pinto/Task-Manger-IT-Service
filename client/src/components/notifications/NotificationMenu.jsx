import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCheck, LoaderCircle } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";
import { useNotificationMutations } from "../../hooks/useNotificationMutations";
import { NotificationItem } from "./NotificationItem";

const MENU_LIMIT = 5;

export function NotificationMenu({
  id,
  placement = "sidebar",
  unreadCount,
  onUnreadDelta,
  onMarkedAllRead,
  onClose,
  menuRef,
}) {
  const navigate = useNavigate();
  const params = useMemo(() => ({ page: 1, limit: MENU_LIMIT }), []);
  const { notifications, loading, error, refetch } = useNotifications(params);
  const { markRead, markAllRead, submitting } = useNotificationMutations();
  const [readIds, setReadIds] = useState(() => new Set());

  const isRead = (notification) =>
    notification.is_read || readIds.has(notification.id);

  const updateReadIds = (notificationId, read) => {
    setReadIds((previousIds) => {
      const nextIds = new Set(previousIds);
      if (read) nextIds.add(notificationId);
      else nextIds.delete(notificationId);
      return nextIds;
    });
  };

  const handleSelect = async (notification) => {
    const wasUnread = !isRead(notification);

    onClose({ restoreFocus: !notification.related_task_id });
    if (notification.related_task_id) {
      navigate(`/tasks/${notification.related_task_id}`);
    }

    if (!wasUnread) return;

    updateReadIds(notification.id, true);
    onUnreadDelta(-1);

    try {
      await markRead(notification.id);
    } catch {
      updateReadIds(notification.id, false);
      onUnreadDelta(1);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setReadIds(
        new Set(notifications.map((notification) => notification.id)),
      );
      onMarkedAllRead();
    } catch {
      // Pesan error sudah ditampilkan oleh useNotificationMutations.
    }
  };

  const handleKeyDown = (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const items = Array.from(
      event.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)'),
    );
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + step + items.length) % items.length;
    items[nextIndex].focus();
  };

  const placementClassName =
    placement === "header"
      ? "fixed inset-x-4 top-16 max-h-[calc(100dvh-10rem)]"
      : "absolute left-0 top-full mt-2 w-80 max-h-[min(32rem,calc(100vh-6rem))]";

  return (
    <div
      id={id}
      ref={menuRef}
      role="menu"
      aria-label="Notifikasi"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={`${placementClassName} z-40 flex select-text flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg focus:outline-none`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="m-0 text-sm font-semibold text-slate-900">
          Notifikasi
        </h2>
        <button
          type="button"
          role="menuitem"
          onClick={handleMarkAllRead}
          disabled={submitting || unreadCount === 0}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#0284C7] transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
        >
          {submitting ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCheck className="h-3.5 w-3.5" />
          )}
          Tandai semua dibaca
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={loading}>
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#0EA5E9]" />
            Memuat notifikasi...
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 px-4 py-8 text-center text-sm text-rose-700"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </span>
            <button
              type="button"
              role="menuitem"
              onClick={refetch}
              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-rose-50"
            >
              Coba lagi
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <p className="m-0 px-4 py-10 text-center text-sm text-slate-500">
            Belum ada notifikasi.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <NotificationItem
                  notification={notification}
                  isRead={isRead(notification)}
                  onSelect={handleSelect}
                  role="menuitem"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        to="/notifications"
        role="menuitem"
        onClick={() => onClose({ restoreFocus: false })}
        className="border-t border-slate-100 px-4 py-3 text-center text-xs font-semibold text-[#0284C7] transition hover:bg-slate-50 focus:outline-none focus-visible:bg-sky-50"
      >
        Lihat semua
      </Link>
    </div>
  );
}
