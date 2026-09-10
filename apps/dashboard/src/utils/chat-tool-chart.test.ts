import { describe, expect, test } from "bun:test";

import { rankBarChartSegments } from "./chat-tool-chart";

describe("rankBarChartSegments", () => {
  test("orders engines by mention rate and labels them from the catalog", () => {
    const rows = rankBarChartSegments([
      { label: "google/gemini-3-flash (grounded)", value: 51 },
      { label: "openai/gpt-5.4-grounded", value: 72.4 },
    ]);

    expect(rows.map((row) => row.name)).toEqual(["GPT-5.4", "Gemini 3 Flash"]);
    expect(rows[0]?.valueLabel).toBe("72.4%");
    expect(rows[0]?.widthPercent).toBeCloseTo(72.4);
    expect(rows[1]?.widthPercent).toBeCloseTo(51);
  });

  test("adds Search only when the same model appears grounded and raw", () => {
    const rows = rankBarChartSegments([
      { label: "openai/gpt-5.4-grounded", value: 73.9 },
      { label: "openai/gpt-5.4", value: 70.7 },
      { label: "perplexity-sonar", value: 64.6 },
    ]);

    expect(rows.map((row) => row.name)).toEqual([
      "GPT-5.4 Search",
      "GPT-5.4",
      "Sonar",
    ]);
  });
});
