import React, { useState } from "react";
import { UserRound, Plus, X, Check } from "lucide-react";
import { personName } from "../../utils/formatters";

export function TaskAssignmentsSection({
  assignments = [],
  onAssign,
  assigning = false,
  canAssign = true,
}) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [userId, setUserId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim()) return;
    if (onAssign) {
      try {
        await onAssign(userId.trim());
        setUserId("");
        setIsAssigning(false);
      } catch {
        // Error handled in parent via toast
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {assignments.length} teknisi ditugaskan
        </span>
        {canAssign && !isAssigning && (
          <button
            type="button"
            onClick={() => setIsAssigning(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0EA5E9] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#0284C7]"
          >
            <Plus className="h-3.5 w-3.5" />
            Assign Teknisi
          </button>
        )}
      </div>

      {isAssigning && (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input
            type="text"
            placeholder="Masukkan User ID Teknisi..."
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={assigning}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          />
          <button
            type="submit"
            disabled={assigning || !userId.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            {assigning ? "Menugaskan..." : "Simpan"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAssigning(false);
              setUserId("");
            }}
            disabled={assigning}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      {assignments.length > 0 ? (
        <ul className="mb-0 space-y-3 pl-0">
          {assignments.map((assignment, index) => (
            <li
              key={assignment.id || assignment.user?.id || index}
              className="flex min-w-0 items-center gap-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[#0284C7]">
                <UserRound aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-semibold text-slate-800">
                  {personName(assignment.user)}
                </p>
                <p className="m-0 mt-0.5 truncate text-xs text-slate-400">
                  {assignment.user?.email || "Teknisi"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm leading-relaxed text-slate-500">
          Belum ada teknisi yang ditugaskan pada tugas ini.
        </p>
      )}
    </div>
  );
}
