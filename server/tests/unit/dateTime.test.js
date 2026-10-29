import { describe, expect, it } from "vitest";
import {
  formatLocalTimestamp,
  isDateOnly,
  localDayEndUtc,
  localDayStartUtc,
  parseDbTimestamp,
} from "../../src/utils/dateTime.js";

describe("isDateOnly", () => {
  it("only accepts YYYY-MM-DD strings", () => {
    expect(isDateOnly("2026-10-28")).toBe(true);
    expect(isDateOnly("2026-10-28T00:00:00")).toBe(false);
    expect(isDateOnly(20261028)).toBe(false);
  });
});

describe("local day bounds (WIB -> UTC)", () => {
  it("starts a WIB day at 17:00 UTC of the previous day", () => {
    expect(localDayStartUtc("2026-10-28")).toBe("2026-10-27T17:00:00.000");
  });

  it("ends a WIB day at 16:59:59.999 UTC", () => {
    expect(localDayEndUtc("2026-10-28")).toBe("2026-10-28T16:59:59.999");
  });

  it("returns null for impossible dates", () => {
    expect(localDayStartUtc("2026-13-45")).toBeNull();
  });
});

describe("parseDbTimestamp", () => {
  it("treats zoneless database values as UTC", () => {
    expect(parseDbTimestamp("2026-10-28T03:00:00.123").toISOString()).toBe(
      "2026-10-28T03:00:00.123Z",
    );
    expect(parseDbTimestamp("2026-10-28 03:00:00").toISOString()).toBe(
      "2026-10-28T03:00:00.000Z",
    );
  });

  it("keeps values that already carry a zone", () => {
    expect(parseDbTimestamp("2026-10-28T03:00:00Z").toISOString()).toBe(
      "2026-10-28T03:00:00.000Z",
    );
  });
});

describe("formatLocalTimestamp", () => {
  it("formats a database timestamp in WIB", () => {
    expect(formatLocalTimestamp("2026-10-28T03:00:00.123")).toBe(
      "2026-10-28 10:00:00",
    );
  });

  it("handles empty and invalid values", () => {
    expect(formatLocalTimestamp(null)).toBe("");
    expect(formatLocalTimestamp("bukan tanggal")).toBe("bukan tanggal");
  });
});
