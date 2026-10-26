export const USER_ROLES = [
  "SUPER_ADMIN",
  "MANAGER_DIVISION",
  "STAFF",
  "TECHNICIAN",
];

export const divisionRequiredRoles = new Set([
  "MANAGER_DIVISION",
  "TECHNICIAN",
]);

export const roleLabels = {
  SUPER_ADMIN: "Super Admin",
  MANAGER_DIVISION: "Manager Divisi",
  STAFF: "Staff",
  TECHNICIAN: "Teknisi",
};

export const roleStyles = {
  SUPER_ADMIN: "border-violet-200 bg-violet-50 text-violet-700",
  MANAGER_DIVISION: "border-sky-200 bg-sky-50 text-sky-700",
  STAFF: "border-emerald-200 bg-emerald-50 text-emerald-700",
  TECHNICIAN: "border-amber-200 bg-amber-50 text-amber-700",
};

export const userStatusLabels = {
  active: "Aktif",
  inactive: "Nonaktif",
  archived: "Arsip",
};

export const userStatusStyles = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  inactive: "border-amber-200 bg-amber-50 text-amber-700",
  archived: "border-slate-200 bg-slate-100 text-slate-500",
};

export const statusFilterOptions = [
  { value: "all", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

export function userStatusKey(user) {
  if (user?.deleted_at) return "archived";
  return user?.is_active ? "active" : "inactive";
}

export function formatRole(role) {
  return roleLabels[role] || role || "Role tidak diketahui";
}
