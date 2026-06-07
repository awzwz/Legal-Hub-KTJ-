import { describe, expect, it } from "vitest";

import { buildCasesWorkbook, toSpreadsheetCell } from "@/lib/exportCases";

describe("toSpreadsheetCell", () => {
  it("prevents spreadsheet formula injection", () => {
    expect(toSpreadsheetCell("=HYPERLINK(\"https://example.test\")")).toBe(
      "'=HYPERLINK(\"https://example.test\")",
    );
    expect(toSpreadsheetCell("+123")).toBe("'+123");
  });

  it("keeps regular spreadsheet values", () => {
    expect(toSpreadsheetCell("АО \"Тест\"")).toBe("АО \"Тест\"");
    expect(toSpreadsheetCell(100)).toBe(100);
    expect(toSpreadsheetCell(null)).toBe("");
  });

  it("generates an xlsx workbook", async () => {
    const bytes = new Uint8Array(await buildCasesWorkbook([]));
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  });
});
