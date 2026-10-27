import { useCallback, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import {
  markAllNotificationsRead as markAllNotificationsReadService,
  markNotificationRead as markNotificationReadService,
} from "../services/notificationService.js";
import { emitNotificationsChanged } from "../utils/notificationEvents.js";

export function useNotificationMutations() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(
    async (action, successMessage, fallbackMessage) => {
      setSubmitting(true);

      try {
        const result = await action();
        emitNotificationsChanged();
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (requestError) {
        toast.error(
          requestError.response?.data?.message ||
            requestError.message ||
            fallbackMessage,
        );
        throw requestError;
      } finally {
        setSubmitting(false);
      }
    },
    [toast],
  );

  const markRead = useCallback(
    (notificationId) =>
      run(
        () => markNotificationReadService(notificationId),
        null,
        "Gagal menandai notifikasi sebagai dibaca.",
      ),
    [run],
  );

  const markAllRead = useCallback(
    () =>
      run(
        markAllNotificationsReadService,
        "Semua notifikasi ditandai dibaca.",
        "Gagal menandai semua notifikasi.",
      ),
    [run],
  );

  return { markRead, markAllRead, submitting };
}
