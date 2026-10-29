import { describe, expect, it } from "vitest";
import { toCsv, toCsvCell } from "../../src/utils/csv.js";
import { isValidAttachmentPath } from "../../src/utils/attachmentUrl.js";

describe("toCsvCell", () => {
  it("quotes values and escapes double quotes", () => {
    expect(toCsvCell('Kabel "LAN"')).toBe('"Kabel ""LAN"""');
    expect(toCsvCell(null)).toBe('""');
  });

  it.each(["=SUM(A1)", "+1", "-1", "@cmd"])(
    "prefixes %j to block spreadsheet formulas",
    (value) => {
      expect(toCsvCell(value)).toBe(`"'${value}"`);
    },
  );
});

describe("toCsv", () => {
  it("starts with a UTF-8 BOM and uses CRLF rows", () => {
    const csv = toCsv(["A", "B"], [["1", "2"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('"A","B"\r\n"1","2"\r\n');
  });
});

describe("isValidAttachmentPath", () => {
  const taskId = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

  it("accepts exactly <taskId>/<file>", () => {
    expect(isValidAttachmentPath(`${taskId}/123-foto.jpg`, taskId)).toBe(true);
  });

  it.each([
    ["another task folder", "other-task/foto.jpg"],
    ["nested folders", `${taskId}/a/foto.jpg`],
    ["path traversal", `${taskId}/../other/foto.jpg`],
    ["dot-dot file name", `${taskId}/..`],
    ["empty file name", `${taskId}/`],
    ["backslash", `${taskId}/a\\b.jpg`],
  ])("rejects %s", (_label, filePath) => {
    expect(isValidAttachmentPath(filePath, taskId)).toBe(false);
  });

  it("rejects non-string paths", () => {
    expect(isValidAttachmentPath(undefined, taskId)).toBe(false);
  });
});
