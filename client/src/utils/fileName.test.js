import { describe, expect, it } from "vitest";
import { toStorageFileName } from "./fileName";

describe("toStorageFileName", () => {
  it.each([
    ["Foto Kerusakan #1 (é).jpg", "foto-kerusakan-1-e.jpg"],
    ["ñoño%?.PNG", "nono.png"],
    ["laporan.pdf", "laporan.pdf"],
    ["a.b.c.JPEG", "a-b-c.jpeg"],
    [".env", "env"],
    ["💥.webp", "lampiran.webp"],
  ])("%j -> %j", (input, expected) => {
    expect(toStorageFileName(input)).toBe(expected);
  });

  it("limits the base name to 80 characters", () => {
    const result = toStorageFileName(`${"a".repeat(120)}.jpg`);
    expect(result).toBe(`${"a".repeat(80)}.jpg`);
  });
});
