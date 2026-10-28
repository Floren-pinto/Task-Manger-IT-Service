import { ApiError } from "./ApiError.js";

// Aturan input yang sama untuk semua controller:
// - field wajib: string tidak kosong setelah trim, ada batas panjang
// - field opsional: undefined = tidak diubah, null/"" = dikosongkan
// - boolean harus benar-benar boolean (bukan "true"/"yes")

export function cleanString(value) {
  return typeof value === "string" ? value.trim() : value;
}

export function parseRequiredText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${field} is required`);
  }

  const text = value.trim();
  if (text.length > maxLength) {
    throw new ApiError(400, `${field} must be at most ${maxLength} characters`);
  }

  return text;
}

export function parseOptionalText(value, field, maxLength) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new ApiError(400, `${field} must be a string`);
  }

  const text = value.trim();
  if (text.length > maxLength) {
    throw new ApiError(400, `${field} must be at most ${maxLength} characters`);
  }

  return text || null;
}

export function parseOptionalBoolean(value, field) {
  if (value !== undefined && typeof value !== "boolean") {
    throw new ApiError(400, `${field} must be a boolean`);
  }
  return value;
}
