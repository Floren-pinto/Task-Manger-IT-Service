import React, { useRef } from "react";
import { FileText, Download, Plus, Trash2 } from "lucide-react";

export function TaskAttachmentsSection({
  attachments = [],
  onUpload,
  onDelete,
  uploading = false,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
      e.target.value = "";
    }
  };

  const imageAttachments = attachments.filter(
    (file) => file.file_type?.startsWith("image/") && file.file_url,
  );

  const otherAttachments = attachments.filter(
    (file) => !file.file_type?.startsWith("image/") || !file.file_url,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {attachments.length} lampiran
        </span>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0EA5E9] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#0284C7] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {uploading ? "Mengunggah..." : "Add Photo"}
          </button>
        </div>
      </div>

      {imageAttachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {imageAttachments.map((file, index) => (
            <div
              key={file.id || index}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100"
            >
              <a
                href={file.file_url}
                target="_blank"
                rel="noreferrer"
                className="block h-full w-full"
              >
                <img
                  src={file.file_url}
                  alt={file.file_name || "Bukti foto tugas"}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </a>
              <span className="absolute inset-x-0 bottom-0 truncate bg-slate-900/60 px-2 py-1.5 text-[10px] text-white">
                {file.file_name || "Bukti foto"}
              </span>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(file.id)}
                  aria-label="Hapus lampiran"
                  className="absolute right-1.5 top-1.5 rounded-md bg-rose-600/80 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {otherAttachments.length > 0 && (
        <ul className="mb-0 space-y-2 pl-0">
          {otherAttachments.map((file, index) => (
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
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(file.id)}
                  aria-label="Hapus lampiran"
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {attachments.length === 0 && (
        <p className="m-0 text-sm leading-relaxed text-slate-500">
          Bukti foto atau lampiran belum tersedia untuk tugas ini.
        </p>
      )}
    </div>
  );
}
