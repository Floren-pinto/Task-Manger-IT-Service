export function formatTaskId(id) {
  if (!id) return "—";
  return `#${id.slice(0, 8).toUpperCase()}`;
}
