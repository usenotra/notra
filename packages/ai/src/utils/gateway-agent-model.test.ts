import { describe, expect, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";

import { withGatewayAgentOptions } from "./gateway-agent-model";

describe("background agent flex routing", () => {
  test.each([
    { modelId: "openai/gpt-6-sol", tag: "content-writer-agent", tier: "flex" },
    { modelId: "openai/gpt-6-sol", tag: "agent-task", tier: "flex" },
    { modelId: "openai/gpt-6-sol", tag: "agent-chat", tier: undefined },
    {
      modelId: "openai/gpt-6-luna",
      tag: "content-writer-agent",
      tier: undefined,
    },
    {
      modelId: "anthropic/claude-sonnet-5.5",
      tag: "content-writer-agent",
      tier: undefined,
    },
    { modelId: "openai/gpt-6-sol", tag: "onboarding-agent", tier: undefined },
  ])(
    "$modelId on $tag uses $tier while preserving privacy and reasoning",
    async (scenario) => {
      const model = new MockLanguageModelV4({
        modelId: scenario.modelId,
        doGenerate: {
          content: [{ type: "text", text: "Done" }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
          },
          warnings: [],
        },
      });
      const wrapped = withGatewayAgentOptions(model, scenario.tag);
      await wrapped.doGenerate({
        prompt: [
          {
            role: "user",
            content: [{ type: "text", text: "Create a changelog" }],
          },
        ],
        providerOptions: {
          gateway: {
            zeroDataRetention: true,
            disallowPromptTraining: true,
            order: ["openai"],
          },
          openai: { reasoningEffort: "low" },
        },
      });
      const sent = model.doGenerateCalls[0]?.providerOptions;
      expect(sent?.gateway).toEqual({
        zeroDataRetention: true,
        disallowPromptTraining: true,
        order: ["openai"],
        caching: "auto",
        tags: [scenario.tag],
        ...(scenario.tier ? { serviceTier: scenario.tier } : {}),
      });
      expect(sent?.openai).toEqual({ reasoningEffort: "low" });
    }
  );
});
