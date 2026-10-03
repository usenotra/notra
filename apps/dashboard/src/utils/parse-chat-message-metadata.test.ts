import { describe, expect, test } from "bun:test";

import { parseChatMessageMetadata } from "./parse-chat-message-metadata";

describe("parseChatMessageMetadata", () => {
  test("keeps duration when the routed model is not a selectable chat model", () => {
    const parsed = parseChatMessageMetadata({
      model: "openai/gpt-5.4-mini",
      generationDurationMs: 4200,
      thinkingLevel: "off",
    });

    expect(parsed?.model).toBe("openai/gpt-5.4-mini");
    expect(parsed?.generationDurationMs).toBe(4200);
  });
});
