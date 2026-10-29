import { describe, expect, it } from "vitest";
import { isArchived, parseDbDate } from "./formatters";

describe("parseDbDate", () => {
  it("treats zoneless database timestamps as UTC", () => {
    expect(parseDbDate("2026-10-28T03:00:00.123").toISOString()).toBe(
      "2026-10-28T03:00:00.123Z",
    );
    expect(parseDbDate("2026-10-28 03:00:00").toISOString()).toBe(
      "2026-10-28T03:00:00.000Z",
    );
  });

  it("keeps values that already carry a zone", () => {
    expect(parseDbDate("2026-10-28T03:00:00Z").toISOString()).toBe(
      "2026-10-28T03:00:00.000Z",
    );
    expect(parseDbDate("2026-10-28T10:00:00+07:00").toISOString()).toBe(
      "2026-10-28T03:00:00.000Z",
    );
  });

  it("parses date-only strings without appending a zone", () => {
    expect(parseDbDate("2026-10-28").toISOString()).toBe(
      "2026-10-28T00:00:00.000Z",
    );
  });
});

describe("isArchived", () => {
  it("is true only when deleted_at is set", () => {
    expect(isArchived({ deleted_at: "2026-10-28T03:00:00" })).toBe(true);
    expect(isArchived({ deleted_at: null })).toBe(false);
    expect(isArchived(null)).toBe(false);
  });
});
