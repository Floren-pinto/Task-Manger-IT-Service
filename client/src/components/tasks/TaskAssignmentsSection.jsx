import React from "react";
import { UserRound } from "lucide-react";
import { personName } from "../../utils/formatters";
import { AssignTechnicianDialog } from "./AssignTechnicianDialog";

export function TaskAssignmentsSection({
  assignments = [],
  onAssign,
  assigning = false,
  canAssign = true,
}) {
  const assignedIds = assignments
    .map((assignment) => assignment.user?.id || assignment.user_id)
    .filter(Boolean);

  const handleSelectTechnician = async (user) => {
    if (onAssign) {
      await onAssign(user.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {assignments.length} teknisi ditugaskan
        </span>
        {canAssign && (
          <AssignTechnicianDialog
            onSelect={handleSelectTechnician}
            assigning={assigning}
            assignedIds={assignedIds}
          />
        )}
      </div>

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
