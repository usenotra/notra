import { describe, expect, test } from "bun:test";

import {
  tableDataToCopyFormat,
  tableDataToCsv,
  tableDataToMarkdown,
  tableDataToPlain,
} from "./message-table";

const TABLE = {
  headers: ["Engine", "Rate"],
  rows: [
    ["GPT-5.4", "72%"],
    ["Gemini 3 Flash", "51%"],
  ],
};

describe("tableDataToCopyFormat", () => {
  test("csv quotes cells that contain commas", () => {
    expect(
      tableDataToCsv({
        headers: ["Name", "Note"],
        rows: [["Acme, Inc", "ok"]],
      })
    ).toBe('Name,Note\n"Acme, Inc",ok');
  });

  test("markdown keeps a pipe-escaped grid", () => {
    expect(tableDataToMarkdown(TABLE)).toBe(
      [
        "| Engine | Rate |",
        "| --- | --- |",
        "| GPT-5.4 | 72% |",
        "| Gemini 3 Flash | 51% |",
      ].join("\n")
    );
  });

  test("plain uses tabs so spreadsheets can paste it", () => {
    expect(tableDataToPlain(TABLE)).toBe(
      "Engine\tRate\nGPT-5.4\t72%\nGemini 3 Flash\t51%"
    );
  });

  test("dispatches by format", () => {
    expect(tableDataToCopyFormat(TABLE, "markdown")).toBe(
      tableDataToMarkdown(TABLE)
    );
    expect(tableDataToCopyFormat(TABLE, "csv")).toBe(tableDataToCsv(TABLE));
    expect(tableDataToCopyFormat(TABLE, "plain")).toBe(tableDataToPlain(TABLE));
  });
});
