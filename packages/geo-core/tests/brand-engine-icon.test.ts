import { describe, expect, test } from "bun:test";

import { brandEngineIconKey } from "../src/utils/geo-engine-icon";

describe("brandEngineIconKey", () => {
  test("maps ChatGPT and its domains onto the themed OpenAI mark", () => {
    expect(brandEngineIconKey("ChatGPT")).toBe("openai");
    expect(brandEngineIconKey("OpenAI")).toBe("openai");
    expect(brandEngineIconKey("Chat GPT", null)).toBe("openai");
    expect(brandEngineIconKey("Acme", "https://www.openai.com/")).toBe(
      "openai"
    );
    expect(brandEngineIconKey("Acme", "chatgpt.com")).toBe("openai");
  });

  test("maps the other engine brands that visibility already themes", () => {
    expect(brandEngineIconKey("Claude")).toBe("claude");
    expect(brandEngineIconKey("Gemini")).toBe("gemini");
    expect(brandEngineIconKey("Perplexity")).toBe("perplexity");
    expect(brandEngineIconKey("Grok", "x.ai")).toBe("grok");
    expect(brandEngineIconKey("Kimi")).toBe("kimi");
  });

  test("leaves ordinary brands on the remote logo", () => {
    expect(brandEngineIconKey("Google")).toBeNull();
    expect(brandEngineIconKey("Microsoft")).toBeNull();
    expect(brandEngineIconKey("Profound", "tryprofound.com")).toBeNull();
    expect(brandEngineIconKey("")).toBeNull();
  });
});
