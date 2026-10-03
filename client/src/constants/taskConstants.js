export const statusUpdateRoles = new Set([
  "SUPER_ADMIN",
  "MANAGER_DIVISION",
  "TECHNICIAN",
]);

export const availableStatuses = [
  "PENDING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];

export const workflowSteps = [
  { id: "NEW", label: "Baru" },
  { id: "ASSIGNED", label: "Ditugaskan" },
  { id: "IN_PROGRESS", label: "Dikerjakan" },
  { id: "COMPLETED", label: "Selesai" },
];

export const statusStep = {
  PENDING: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  ON_HOLD: 2,
  COMPLETED: 3,
  CANCELLED: -1,
};

export const statusLabels = {
  PENDING: "Menunggu",
  ASSIGNED: "Ditugaskan",
  IN_PROGRESS: "Dikerjakan",
  ON_HOLD: "Tertahan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const statusStyles = {
  PENDING: "border-orange-200 bg-orange-50 text-orange-600",
  ASSIGNED: "border-slate-200 bg-slate-100 text-slate-700",
  IN_PROGRESS: "border-green-200 bg-green-50 text-green-700",
  ON_HOLD: "border-orange-200 bg-orange-50 text-orange-700",
  COMPLETED: "border-slate-200 bg-slate-50 text-slate-500",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

export const priorityStyles = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-50 text-sky-700",
  HIGH: "bg-orange-50 text-orange-700",
  URGENT: "bg-orange-50 text-orange-600",
};
