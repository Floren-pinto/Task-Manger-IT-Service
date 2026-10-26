import { useEffect } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";

function ConfirmDialogContent({
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant,
  loading,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onClose]);

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget && !loading) onClose?.();
  };

  const confirmClassName =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700"
      : "bg-[#0EA5E9] hover:bg-[#0284C7]";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]"
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={
          description ? "confirm-dialog-description" : undefined
        }
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="flex items-start gap-3">
            {variant === "danger" && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
            )}
            <div>
              <h2
                id="confirm-dialog-title"
                className="m-0 text-base font-bold text-slate-900"
              >
                {title}
              </h2>
              {description && (
                <p
                  id="confirm-dialog-description"
                  className="m-0 mt-1 text-sm text-slate-500"
                >
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup dialog konfirmasi"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <footer className="flex items-center justify-end gap-2 px-5 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClassName}`}
          >
            {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title = "Konfirmasi tindakan",
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "danger",
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <ConfirmDialogContent
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      variant={variant}
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
