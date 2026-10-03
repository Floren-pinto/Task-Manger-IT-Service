import { statusLabels } from "../constants/taskConstants";

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

export function personName(person) {
  if (typeof person === "string") return person;
  return person?.name || person?.email || "Nama tidak tersedia";
}
