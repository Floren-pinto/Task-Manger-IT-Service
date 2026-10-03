import React from "react";
import { FileText, Download } from "lucide-react";

export function TaskAttachmentsSection({ attachments = [] }) {
  const imageAttachments = attachments.filter(
    (file) => file.file_type?.startsWith("image/") && file.file_url,
  );

  if (imageAttachments.length > 0) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {imageAttachments.map((file, index) => (
          <a
            key={file.id || index}
            href={file.file_url}
            target="_blank"
            rel="noreferrer"
            className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100"
          >
            <img
              src={file.file_url}
              alt={file.file_name || "Bukti foto tugas"}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 truncate bg-slate-900/60 px-2 py-1.5 text-[10px] text-white">
              {file.file_name || "Bukti foto"}
            </span>
          </a>
        ))}
      </div>
    );
  }

  if (attachments.length > 0) {
    return (
      <ul className="mb-0 space-y-2 pl-0">
        {attachments.map((file, index) => (
          <li
            key={file.id || index}
            className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 p-3"
          >
            <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
              {file.file_name || "Lampiran tanpa nama"}
            </span>
            {file.file_url && (
              <a
                href={file.file_url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Unduh ${file.file_name || "lampiran"}`}
                className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0284C7]"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
              </a>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="m-0 text-sm leading-relaxed text-slate-500">
      Bukti foto belum tersedia untuk tugas ini.
    </p>
  );
}
