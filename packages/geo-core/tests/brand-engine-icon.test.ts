import { describe, expect, test } from "bun:test";

import { brandEngineIconKey } from "../src/utils/geo-engine-family";

describe("brandEngineIconKey", () => {
  test("uses the engine mark when the brand name is that engine", () => {
    expect(brandEngineIconKey("ChatGPT")).toBe("openai");
    expect(brandEngineIconKey("OpenAI")).toBe("openai");
    expect(brandEngineIconKey("Claude")).toBe("claude");
    expect(brandEngineIconKey("Gemini")).toBe("gemini");
  });

  test("leaves other brands on the remote logo", () => {
    expect(brandEngineIconKey("Google")).toBeNull();
    expect(brandEngineIconKey("Microsoft")).toBeNull();
    expect(brandEngineIconKey("Profound")).toBeNull();
  });
});
