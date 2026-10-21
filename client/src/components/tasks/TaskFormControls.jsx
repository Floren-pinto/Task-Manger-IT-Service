export const taskInputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#0EA5E9] focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50";

export function TaskFormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-slate-600"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="m-0 text-xs text-slate-400">{hint}</p>}
      {error && <p className="m-0 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
