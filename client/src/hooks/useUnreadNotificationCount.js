import { useCallback, useEffect, useRef, useState } from "react";
import { getUnreadCount } from "../services/notificationService.js";
import { subscribeNotificationsChanged } from "../utils/notificationEvents.js";

const POLLING_INTERVAL_MS = 60_000;

function isTabVisible() {
  return (
    typeof document === "undefined" || document.visibilityState === "visible"
  );
}

export function useUnreadNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const refetch = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const count = await getUnreadCount();
      if (requestId.current !== currentRequestId) return null;
      setUnreadCount(count);
      return count;
    } catch (requestError) {
      if (requestId.current !== currentRequestId) return null;
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Gagal memuat jumlah notifikasi.",
      );
      return null;
    } finally {
      if (requestId.current === currentRequestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refetch();

    const handleVisibleRefetch = () => {
      if (isTabVisible()) void refetch();
    };

    // Fallback bila Realtime belum aktif atau koneksinya terputus.
    const intervalId = window.setInterval(
      handleVisibleRefetch,
      POLLING_INTERVAL_MS,
    );
    const unsubscribe = subscribeNotificationsChanged(handleVisibleRefetch);

    window.addEventListener("focus", handleVisibleRefetch);
    document.addEventListener("visibilitychange", handleVisibleRefetch);

    return () => {
      requestId.current += 1;
      window.clearInterval(intervalId);
      unsubscribe();
      window.removeEventListener("focus", handleVisibleRefetch);
      document.removeEventListener("visibilitychange", handleVisibleRefetch);
    };
  }, [refetch]);

  return { unreadCount, setUnreadCount, loading, error, refetch };
}
