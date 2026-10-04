import React from "react";
import { formatDate } from "../../utils/formatters";

export function TaskActivityLog({ activity = [], createdAt, dueDate }) {
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Dibuat
          </p>
          <p className="mb-0 mt-1 text-xs font-medium text-slate-600">
            {formatDate(createdAt, true)}
          </p>
        </div>
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Tenggat
          </p>
          <p className="mb-0 mt-1 text-xs font-medium text-slate-600">
            {formatDate(dueDate)}
          </p>
        </div>
      </div>
      {activity.length > 0 ? (
        <ol className="mb-0 space-y-0 pl-0">
          {activity.map((item, index) => (
            <li
              key={item.id || `${item.date}-${index}`}
              className="relative flex gap-3 pb-4 last:pb-0"
            >
              {index < activity.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[5px] top-3 h-full w-px bg-slate-200"
                />
              )}
              <span className="relative mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-[#0EA5E9] bg-white" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:gap-2">
                  <p className="m-0 break-words text-xs font-semibold text-slate-700">
                    {item.title}
                  </p>
                  <time className="shrink-0 text-[10px] text-slate-400">
                    {formatDate(item.date, true)}
                  </time>
                </div>
                <p className="mb-0 mt-1 break-words text-xs leading-relaxed text-slate-500">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 text-sm leading-relaxed text-slate-500">
          Belum ada aktivitas tercatat selain pembuatan tugas.
        </p>
      )}
    </>
  );
}
