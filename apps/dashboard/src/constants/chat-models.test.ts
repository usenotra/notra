import { expect, test } from "bun:test";

import {
  AVAILABLE_MODELS,
  LEGACY_CHAT_MODELS,
  ZDR_AVAILABLE_MODELS,
} from "./chat-models";

test("ZDR chat choices omit GPT-6 and keep older models displayable", () => {
  expect(
    AVAILABLE_MODELS.some((model) => model.id === "openai/gpt-6-sol")
  ).toBe(true);
  expect(
    ZDR_AVAILABLE_MODELS.some((model) => model.id.startsWith("openai/gpt-6-"))
  ).toBe(false);
  expect(
    LEGACY_CHAT_MODELS.find(
      (model) => model.id === "anthropic/claude-sonnet-4.6"
    )?.label
  ).toBe("Sonnet 4.6");
});
