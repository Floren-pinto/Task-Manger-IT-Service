import { describe, expect, it } from "vitest";
import {
  cleanString,
  parseOptionalBoolean,
  parseOptionalText,
  parseRequiredText,
} from "../../src/utils/validation.js";

// Helper agar assertion error ApiError ringkas.
function errorOf(fn) {
  try {
    fn();
  } catch (error) {
    return { status: error.statusCode, message: error.message };
  }
  throw new Error("expected function to throw");
}

describe("cleanString", () => {
  it("trims strings and leaves other values untouched", () => {
    expect(cleanString("  a  ")).toBe("a");
    expect(cleanString(null)).toBeNull();
    expect(cleanString(5)).toBe(5);
  });
});

describe("parseRequiredText", () => {
  it("returns the trimmed text", () => {
    expect(parseRequiredText("  Server rusak ", "title", 20)).toBe(
      "Server rusak",
    );
  });

  it.each([undefined, null, "", "   ", 42])("rejects %j with 400", (value) => {
    expect(errorOf(() => parseRequiredText(value, "title", 20))).toEqual({
      status: 400,
      message: "title is required",
    });
  });

  it("rejects text longer than the limit", () => {
    expect(errorOf(() => parseRequiredText("abcdef", "title", 5))).toEqual({
      status: 400,
      message: "title must be at most 5 characters",
    });
  });
});

describe("parseOptionalText", () => {
  it("keeps undefined so the field is not updated", () => {
    expect(parseOptionalText(undefined, "email", 10)).toBeUndefined();
  });

  it("turns null and blank strings into null", () => {
    expect(parseOptionalText(null, "email", 10)).toBeNull();
    expect(parseOptionalText("   ", "email", 10)).toBeNull();
  });

  it("trims text and enforces the limit", () => {
    expect(parseOptionalText(" a@b.c ", "email", 10)).toBe("a@b.c");
    expect(errorOf(() => parseOptionalText("x".repeat(11), "email", 10)).status).toBe(400);
  });

  it("rejects non-string values", () => {
    expect(errorOf(() => parseOptionalText(3, "email", 10))).toEqual({
      status: 400,
      message: "email must be a string",
    });
  });
});

describe("parseOptionalBoolean", () => {
  it("accepts booleans and undefined", () => {
    expect(parseOptionalBoolean(true, "deleted")).toBe(true);
    expect(parseOptionalBoolean(false, "deleted")).toBe(false);
    expect(parseOptionalBoolean(undefined, "deleted")).toBeUndefined();
  });

  it.each(["true", "yes", 1, null])("rejects %j", (value) => {
    expect(errorOf(() => parseOptionalBoolean(value, "deleted"))).toEqual({
      status: 400,
      message: "deleted must be a boolean",
    });
  });
});
