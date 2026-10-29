import { describe, expect, it } from "vitest";
import {
  isUuid,
  parsePaginationParams,
  sanitizeSearch,
} from "../../src/utils/queryParams.js";

describe("isUuid", () => {
  it("accepts a UUID in any letter case", () => {
    expect(isUuid("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b")).toBe(true);
    expect(isUuid("3F2B8C1E-9A4D-4E6F-8B7A-1C2D3E4F5A6B")).toBe(true);
  });

  it.each(["", "abc", "3f2b8c1e9a4d4e6f8b7a1c2d3e4f5a6b", null, 123])(
    "rejects %j",
    (value) => {
      expect(isUuid(value)).toBe(false);
    },
  );
});

describe("sanitizeSearch", () => {
  it("removes characters with meaning in PostgREST filters", () => {
    expect(sanitizeSearch('a,b(c)d%e*f"g\\h')).toBe("a b c d e f g h");
  });

  it("collapses whitespace", () => {
    expect(sanitizeSearch("  laptop   rusak  ")).toBe("laptop rusak");
  });

  it("keeps a leading # unless stripHash is set", () => {
    expect(sanitizeSearch("#AB12")).toBe("#AB12");
    expect(sanitizeSearch("#AB12", { stripHash: true })).toBe("AB12");
  });
});

describe("parsePaginationParams", () => {
  it("uses page 1 and limit 20 by default", () => {
    expect(parsePaginationParams(undefined, undefined)).toEqual({
      safePage: 1,
      safeLimit: 20,
      from: 0,
      to: 19,
    });
  });

  it("computes the range for later pages", () => {
    expect(parsePaginationParams("3", "10")).toEqual({
      safePage: 3,
      safeLimit: 10,
      from: 20,
      to: 29,
    });
  });

  it("floors fractions and clamps out-of-range values", () => {
    expect(parsePaginationParams("1.5", "20.7")).toMatchObject({
      safePage: 1,
      safeLimit: 20,
    });
    expect(parsePaginationParams("-4", "500")).toMatchObject({
      safePage: 1,
      safeLimit: 100,
    });
    expect(parsePaginationParams("abc", "0")).toMatchObject({
      safePage: 1,
      safeLimit: 20,
    });
  });
});
