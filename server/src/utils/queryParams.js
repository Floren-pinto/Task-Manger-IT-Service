const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// Membuang karakter yang punya arti di filter PostgREST: pemisah `or()` (`,` `(`
// `)`), kutip, dan wildcard (`%` `*`), serta backslash. `stripHash` membuang `#`
// di depan agar ID task yang ditampilkan "#ABCD1234" tetap bisa dicari.
export function sanitizeSearch(value, { stripHash = false } = {}) {
  let text = String(value).trim();
  if (stripHash) text = text.replace(/^#/, "");

  return text
    .replace(/[,()%"*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePaginationParams(page, limit) {
  // Math.floor: "page=1.5" tidak boleh menghasilkan offset pecahan.
  const safeLimit = Math.min(Math.max(Math.floor(Number(limit)) || 20, 1), 100);
  const safePage = Math.max(Math.floor(Number(page)) || 1, 1);
  const from = (safePage - 1) * safeLimit;

  return {
    safePage,
    safeLimit,
    from,
    to: from + safeLimit - 1,
  };
}
