export const clientCreateRoles = new Set([
  "SUPER_ADMIN",
  "MANAGER_DIVISION",
  "STAFF",
]);

export const clientDeleteRoles = new Set(["SUPER_ADMIN", "MANAGER_DIVISION"]);

// Sama dengan clients (lihat RLS 03_assets_policy.sql).
export const assetWriteRoles = new Set([
  "SUPER_ADMIN",
  "MANAGER_DIVISION",
  "STAFF",
]);

export const assetArchiveRoles = new Set(["SUPER_ADMIN", "MANAGER_DIVISION"]);

export const clientStatusLabels = {
  active: "Aktif",
  archived: "Arsip",
};

export const clientStatusStyles = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  archived: "border-slate-200 bg-slate-100 text-slate-500",
};

export const defaultClientLimit = 20;
