import { priorityLabels, statusLabels } from "../constants/taskConstants";

const DATE_TIME_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

// Kolom waktu di database bertipe TIMESTAMP tanpa zona dan berisi waktu UTC,
// sehingga API mengirim "2026-10-28T03:00:00.123" tanpa "Z". new Date() akan
// membacanya sebagai waktu lokal (bergeser 7–9 jam), jadi tandai sebagai UTC.
export function parseDbDate(value) {
  if (typeof value === "string" && DATE_TIME_WITHOUT_ZONE.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`);
  }
  return new Date(value);
}

export function formatDate(value, includeTime = false) {
  if (!value) return "Belum tersedia";
  const date = parseDbDate(value);
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

export function technicianNames(technicians) {
  if (!Array.isArray(technicians) || technicians.length === 0) {
    return "Belum ditugaskan";
  }

  return technicians.map(personName).join(", ");
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

const relativeTimeUnits = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

export function formatRelativeTime(value) {
  if (!value) return "Waktu tidak tersedia";
  const date = parseDbDate(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

  for (const [unit, seconds] of relativeTimeUnits) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return "Baru saja";
}
