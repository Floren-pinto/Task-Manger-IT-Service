import { useMemo } from "react";
import { formatStatus, personName } from "../utils/formatters";

export function useTaskActivity(histories = [], reports = []) {
  return useMemo(() => {
    const historyItems = Array.isArray(histories) ? histories : [];
    const reportItems = Array.isArray(reports) ? reports : [];

    return [
      ...historyItems.map((item) => ({
        id: item.id,
        date: item.changed_at,
        title: `${formatStatus(item.new_status)}${
          item.old_status ? ` (dari ${formatStatus(item.old_status)})` : ""
        }`,
        description: `Status diperbarui oleh ${personName(item.user)}`,
      })),
      ...reportItems.map((item) => ({
        id: item.id,
        date: item.created_at,
        title: item.summary || "Laporan layanan dibuat",
        description: item.action_taken || "Tindakan belum dicatat.",
      })),
    ].sort(
      (first, second) =>
        new Date(second.date || 0).getTime() -
        new Date(first.date || 0).getTime(),
    );
  }, [histories, reports]);
}
