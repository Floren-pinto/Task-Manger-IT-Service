export function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80"
      role="status"
      aria-label="Loading"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-dashed border-[#0EA5E9]" />
    </div>
  );
}
