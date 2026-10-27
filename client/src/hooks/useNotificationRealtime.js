import { useEffect } from "react";
import { supabase } from "../services/supabaseClient.js";
import { emitNotificationsChanged } from "../utils/notificationEvents.js";

export function useNotificationRealtime(userId) {
  useEffect(() => {
    if (!userId) return undefined;

    // Filter user_id hanya optimasi; RLS tetap menjadi pengaman. Isi payload
    // tidak dipakai langsung, data selalu diambil ulang lewat API.
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          emitNotificationsChanged();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
