import { priorityLabels, statusLabels } from "../constants/taskConstants";

export function formatDate(value, includeTime = false) {
  if (!value) return "Belum tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";

  return new Intl.DateTimeFormat(
    "id-ID",
    includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" },
  ).format(date);
}

export function formatStatus(status) {
  return statusLabels[status] || status || "Status tidak tersedia";
}

export function formatPriority(priority) {
  return priorityLabels[priority] || priority || "Prioritas tidak tersedia";
}

export function personName(person) {
  if (typeof person === "string") return person;
  return person?.name || person?.email || "Nama tidak tersedia";
}

export function assigneeNames(assignments) {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return "Belum ditugaskan";
  }

  const names = assignments
    .map((assignment) => assignment.user?.name)
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : "Nama teknisi tidak tersedia";
}

export function isArchived(record) {
  return Boolean(record?.deleted_at);
}

export function formatClientName(client) {
  return client?.name?.trim() || "Client tanpa nama";
}

export function formatAssetLabel(asset) {
  if (!asset) return "Tanpa aset";
  const name = asset.name?.trim() || "Aset tanpa nama";
  return asset.serial_number ? `${name} · ${asset.serial_number}` : name;
}
