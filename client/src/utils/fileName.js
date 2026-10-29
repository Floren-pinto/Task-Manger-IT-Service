// Supabase Storage menolak key dengan karakter non-ASCII dan beberapa simbol
// (#, ?, %, ...). Nama asli tetap disimpan di kolom file_name.
export function toStorageFileName(name) {
  const slugify = (value) =>
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const extension = dotIndex > 0 ? slugify(name.slice(dotIndex + 1)) : "";
  const safeBase = slugify(base).slice(0, 80) || "lampiran";

  return extension ? `${safeBase}.${extension}` : safeBase;
}
