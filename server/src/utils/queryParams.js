const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function sanitizeSearch(value) {
  return String(value)
    .trim()
    .replace(/[,()%"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePaginationParams(page, limit) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const from = (safePage - 1) * safeLimit;

  return {
    safePage,
    safeLimit,
    from,
    to: from + safeLimit - 1,
  };
}
