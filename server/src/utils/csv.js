// Karakter awal yang bisa dieksekusi sebagai formula oleh Excel/Sheets.
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

export function toCsvCell(value) {
  if (value === null || value === undefined) return '""';

  let text = String(value);
  if (FORMULA_PREFIX_PATTERN.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(toCsvCell).join(","));
  // BOM agar Excel membaca file sebagai UTF-8.
  return `﻿${lines.join("\r\n")}\r\n`;
}
