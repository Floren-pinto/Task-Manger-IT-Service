import { useEffect } from "react";
import { getNotifications } from "../services/notificationService.js";
import { subscribeNotificationsChanged } from "../utils/notificationEvents.js";
import { useApiData } from "./useApiData.js";

export function useNotifications(params = {}) {
  const { data, loading, error, refetch } = useApiData(
    getNotifications,
    params,
    { notifications: [], pagination: null },
    "Gagal memuat notifikasi.",
  );

  useEffect(() => subscribeNotificationsChanged(refetch), [refetch]);

  return {
    notifications: Array.isArray(data?.notifications)
      ? data.notifications
      : [],
    pagination: data?.pagination ?? null,
    loading,
    error,
    refetch,
  };
}
