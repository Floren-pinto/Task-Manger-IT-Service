export const statusUpdateRoles = new Set([
  "SUPER_ADMIN",
  "MANAGER_DIVISION",
  "TECHNICIAN",
]);

export const taskCreateRoles = new Set([
  "SUPER_ADMIN",
  "MANAGER_DIVISION",
  "STAFF",
]);

export const taskEditRoles = new Set([...taskCreateRoles, "TECHNICIAN"]);

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
  IN_PROGRESS: 2,
  ON_HOLD: 2,
  COMPLETED: 3,
  CANCELLED: -1,
};

export const statusLabels = {
  PENDING: "Baru",
  IN_PROGRESS: "Dikerjakan",
  ON_HOLD: "Menunggu Sparepart",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const statusStyles = {
  PENDING: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-green-200 bg-green-50 text-green-700",
  ON_HOLD: "border-orange-200 bg-orange-50 text-orange-700",
  COMPLETED: "border-slate-200 bg-slate-50 text-slate-500",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

export const priorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const priorityLabels = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
};

export const priorityStyles = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-50 text-sky-700",
  HIGH: "bg-orange-50 text-orange-700",
  URGENT: "bg-orange-50 text-orange-600",
};

export const taskSortOptions = [
  { value: "created_at:desc", label: "Terbaru" },
  { value: "created_at:asc", label: "Terlama" },
  { value: "due_date:asc", label: "Tenggat terdekat" },
  { value: "due_date:desc", label: "Tenggat terjauh" },
];

export const pageSizeOptions = [10, 20, 50, 100];

export const allowedAttachmentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const reportCreateRoles = new Set([
  "SUPER_ADMIN",
  "MANAGER_DIVISION",
  "TECHNICIAN",
]);

export const reportTextMaxLength = 2000;
