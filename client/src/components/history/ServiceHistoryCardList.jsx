import { ChevronRight } from "lucide-react";
import { formatClientName, formatDate } from "../../utils/formatters";
import { formatTaskId } from "../../utils/formatTaskId";
import { ServiceReportBadge } from "./ServiceHistoryTable";

export function ServiceHistoryCardList({ history = [], emptyMessage, onSelect }) {
  if (history.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-slate-500 xl:hidden">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="m-0 list-none divide-y divide-slate-100 p-0 xl:hidden">
      {history.map((item) => (
        <li key={item.task.id}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold text-slate-500">
                {formatTaskId(item.task.id)}
              </span>
              <span className="mt-0.5 block break-words text-sm font-semibold text-slate-800">
                {item.task.title}
              </span>
              <span className="mt-1 block truncate text-xs text-slate-500">
                {item.client
                  ? formatClientName(item.client)
                  : "Klien tidak tersedia"}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">
                  Selesai {formatDate(item.task.completed_at, true)}
                </span>
                <ServiceReportBadge report={item.report} />
              </span>
            </span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </li>
      ))}
    </ul>
  );
}
