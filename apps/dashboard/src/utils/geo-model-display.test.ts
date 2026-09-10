import { describe, expect, test } from "bun:test";

import { formatChartEngineLabel } from "./geo-model-display";

describe("formatChartEngineLabel", () => {
  test("uses catalog names for raw engine ids", () => {
    expect(formatChartEngineLabel("openai/gpt-5.4-grounded")).toBe("GPT-5.4");
    expect(formatChartEngineLabel("google/gemini-3-flash-grounded")).toBe(
      "Gemini 3 Flash"
    );
    expect(formatChartEngineLabel("opencode/gpt-5.6-sol-medium")).toBe(
      "GPT-5.6 Sol · medium"
    );
  });

  test("formats the older provider/slug (grounded) chart labels", () => {
    expect(formatChartEngineLabel("openai/gpt-5.4 (grounded)")).toBe("GPT-5.4");
    expect(formatChartEngineLabel("google/gemini-3-flash (grounded)")).toBe(
      "Gemini 3 Flash"
    );
  });

  test("leaves already-human labels alone", () => {
    expect(formatChartEngineLabel("GPT-5.4")).toBe("GPT-5.4");
    expect(formatChartEngineLabel("Gemini 3 Flash")).toBe("Gemini 3 Flash");
  });

  test("formats legacy engine ids that have no slash", () => {
    expect(formatChartEngineLabel("perplexity-sonar")).toBe("Sonar");
  });
});
