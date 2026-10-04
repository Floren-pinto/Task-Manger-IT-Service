import React from "react";
import { Check, Circle } from "lucide-react";
import { workflowSteps, statusStep } from "../../constants/taskConstants";

export function TaskStatusWorkflow({ displayedStatus, assignmentsCount }) {
  const stepIndex =
    displayedStatus === "PENDING" && assignmentsCount > 0
      ? 1
      : (statusStep[displayedStatus] ?? 0);

  if (displayedStatus === "CANCELLED") {
    return (
      <p className="m-0 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
        Tugas ini telah dibatalkan.
      </p>
    );
  }

  return (
    <ol className="mb-0 flex list-none items-start p-0">
      {workflowSteps.map((step, index) => {
        const complete = index < stepIndex;
        const current = index === stepIndex;
        return (
          <li
            key={step.id}
            className="relative flex min-w-0 flex-1 flex-col items-center text-center"
          >
            {index < workflowSteps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-1/2 top-3 h-0.5 w-full ${
                  index < stepIndex ? "bg-[#0EA5E9]" : "bg-slate-200"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                current
                  ? "border-[#0EA5E9] bg-sky-50 text-[#0284C7]"
                  : complete
                  ? "border-[#0EA5E9] bg-[#0EA5E9] text-white"
                  : "border-slate-200 bg-white text-slate-300"
              }`}
            >
              {complete ? (
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <Circle
                  aria-hidden="true"
                  className="h-2.5 w-2.5 fill-current"
                />
              )}
            </span>
            <span
              className={`mt-2 px-0.5 text-[10px] font-medium sm:text-xs ${
                current
                  ? "text-[#0284C7]"
                  : complete
                  ? "text-slate-600"
                  : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
