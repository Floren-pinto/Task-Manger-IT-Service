// Kolom waktu di database bertipe TIMESTAMP tanpa zona dan berisi waktu UTC.
// Filter "per hari" mengikuti zona operasional (WIB), jadi batas harinya
// dikonversi ke UTC di sini. PostgreSQL mengabaikan offset (+07:00) pada
// literal yang dibandingkan dengan kolom TIMESTAMP tanpa zona.
export const APP_TIME_ZONE = "Asia/Jakarta";
const APP_UTC_OFFSET = "+07:00";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_WITHOUT_ZONE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export function isDateOnly(value) {
  return typeof value === "string" && DATE_ONLY_PATTERN.test(value);
}

// "YYYY-MM-DD" (hari WIB) -> waktu UTC tanpa zona, mis. "2026-10-27T17:00:00.000".
// Mengembalikan null bila tanggal tidak valid.
function localTimeToUtc(date, time) {
  const instant = new Date(`${date}T${time}${APP_UTC_OFFSET}`);
  return Number.isNaN(instant.getTime())
    ? null
    : instant.toISOString().slice(0, -1);
}

export function localDayStartUtc(date) {
  return localTimeToUtc(date, "00:00:00.000");
}

export function localDayEndUtc(date) {
  return localTimeToUtc(date, "23:59:59.999");
}

// Nilai TIMESTAMP dari database (UTC tanpa zona) -> Date.
export function parseDbTimestamp(value) {
  const text = String(value);
  return new Date(
    DATE_TIME_WITHOUT_ZONE.test(text) ? `${text.replace(" ", "T")}Z` : text,
  );
}

// Untuk export: "2026-10-28 10:00:00" dalam WIB.
export function formatLocalTimestamp(value) {
  if (!value) return "";
  const date = parseDbTimestamp(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}
