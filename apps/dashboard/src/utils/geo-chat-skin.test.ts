import { describe, expect, test } from "bun:test";

import { geoChatSkin } from "./geo-chat-skin";

describe("geoChatSkin", () => {
  test("maps OpenCode engines onto the OpenCode mock instead of ChatGPT", () => {
    expect(geoChatSkin("opencode/gpt-5.6-sol-medium")).toBe("opencode");
    expect(geoChatSkin("opencode")).toBe("opencode");
  });

  test("keeps coding harnesses distinct from their model providers", () => {
    expect(geoChatSkin("claude-code/claude-opus-5")).toBe("claude-code");
    expect(geoChatSkin("claude-code/claude-fable-5.1")).toBe("claude-code");
    expect(geoChatSkin("codex/gpt-6-astra")).toBe("codex");
    expect(geoChatSkin("codex/gpt-5.6-sol-rei")).toBe("codex");
    expect(geoChatSkin("anthropic/claude-opus-5")).toBe("claude");
    expect(geoChatSkin("openai/gpt-6-astra")).toBe("chatgpt");
  });

  test("falls back for an unknown engine", () => {
    expect(geoChatSkin("unknown/future-model")).toBe("chatgpt");
  });

  test("keeps the existing engine skins", () => {
    expect(geoChatSkin("anthropic/claude-sonnet-5")).toBe("claude");
    expect(geoChatSkin("google/gemini-3-flash")).toBe("gemini");
    expect(geoChatSkin("perplexity/sonar")).toBe("perplexity");
    expect(geoChatSkin("openai/gpt-5.4")).toBe("chatgpt");
  });
});
