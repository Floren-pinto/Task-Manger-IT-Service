import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCheck, LoaderCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import { useNotificationMutations } from "../hooks/useNotificationMutations";
import { NotificationItem } from "../components/notifications/NotificationItem";
import { DataPagination } from "../components/ui/DataPagination";
import { pageSizeOptions } from "../constants/taskConstants";

const defaultNotificationLimit = 20;

const notificationTabs = [
  { id: "all", label: "Semua" },
  { id: "unread", label: "Belum dibaca" },
];

export default function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { markRead, markAllRead, submitting } = useNotificationMutations();
  const [readIds, setReadIds] = useState(() => new Set());

  const rawPage = Number(searchParams.get("page"));
  const page = Number.isFinite(rawPage)
    ? Math.max(Math.floor(rawPage), 1)
    : 1;
  const rawLimit = Number(searchParams.get("limit"));
  const limit = pageSizeOptions.includes(rawLimit)
    ? rawLimit
    : defaultNotificationLimit;
  // Hanya ada tab "Semua" dan "Belum dibaca"; nilai isRead lain diabaikan.
  const activeTab = searchParams.get("isRead") === "false" ? "unread" : "all";

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (activeTab === "unread") params.isRead = false;
    return params;
  }, [activeTab, limit, page]);

  const { notifications, pagination, loading, error, refetch } =
    useNotifications(queryParams);

  useEffect(() => {
    setReadIds(new Set());
  }, [notifications]);

  const updateFilters = useCallback(
    (updates) => {
      setSearchParams((previousParams) => {
        const nextParams = new URLSearchParams(previousParams);

        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") {
            nextParams.delete(key);
          } else {
            nextParams.set(key, String(value));
          }
        });

        if (!Object.prototype.hasOwnProperty.call(updates, "page")) {
          nextParams.delete("page");
        }

        return nextParams;
      });
    },
    [setSearchParams],
  );

  // Setelah tandai dibaca di tab "Belum dibaca", halaman aktif bisa kosong.
  useEffect(() => {
    const totalPages = Number(pagination?.totalPages) || 0;
    if (!loading && totalPages > 0 && page > totalPages) {
      updateFilters({ page: totalPages > 1 ? totalPages : undefined });
    }
  }, [loading, page, pagination, updateFilters]);

  const isNotificationRead = (notification) =>
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
    const wasUnread = !isNotificationRead(notification);

    if (notification.related_task_id) {
      navigate(`/tasks/${notification.related_task_id}`);
    }

    if (!wasUnread) return;

    updateReadIds(notification.id, true);

    try {
      await markRead(notification.id);
    } catch {
      updateReadIds(notification.id, false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch {
      // Pesan error sudah ditampilkan oleh useNotificationMutations.
    }
  };

  const handleTabChange = (tabId) => {
    updateFilters({ isRead: tabId === "unread" ? "false" : undefined });
  };

  const handlePageChange = (nextPage) => {
    updateFilters({ page: nextPage > 1 ? nextPage : undefined });
  };

  const handleLimitChange = (nextLimit) => {
    updateFilters({
      limit: nextLimit === defaultNotificationLimit ? undefined : nextLimit,
    });
  };

  const emptyMessage =
    activeTab === "unread"
      ? "Tidak ada notifikasi yang belum dibaca."
      : "Belum ada notifikasi.";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-bold text-slate-900">
            Notifications
          </h1>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Riwayat penugasan dan perubahan status tugas Anda.
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0284C7] disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          {submitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4" />
          )}
          Tandai semua dibaca
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Filter notifikasi"
        className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
      >
        {notificationTabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => handleTabChange(tab.id)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                selected
                  ? "bg-[#0EA5E9] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

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
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#0EA5E9]" />
            Memuat notifikasi...
          </div>
        ) : notifications.length === 0 ? (
          !error && (
            <p className="m-0 px-4 py-16 text-center text-sm text-slate-500">
              {emptyMessage}
            </p>
          )
        ) : (
          <>
            <ul className="m-0 list-none divide-y divide-slate-100 p-0">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    isRead={isNotificationRead(notification)}
                    onSelect={handleSelect}
                    variant="full"
                  />
                </li>
              ))}
            </ul>
            <DataPagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              loading={loading}
              itemLabel="notifikasi"
            />
          </>
        )}
      </div>
    </div>
  );
}
