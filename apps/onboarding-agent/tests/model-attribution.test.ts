import { expect, mock, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";

const actualAi = await import("ai");
const model = new MockLanguageModelV4({
  modelId: "openai/gpt-6-sol",
  doGenerate: async () => ({
    content: [{ type: "text", text: "mock" }],
    finishReason: { unified: "stop", raw: "stop" },
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    },
    warnings: [],
  }),
});
mock.module("ai", () => ({ ...actualAi, gateway: () => model }));
const { createAgentModel } = await import("../agent/lib/utils/model");

test.each([
  "onboarding-agent",
  "onboarding-researcher",
  "onboarding-skill-editor",
])(
  "%s attributes each session while retaining the old Eve fallback",
  async (tag) => {
    const definition = createAgentModel("openai/gpt-6-sol", tag, 1_050_000);
    expect(definition.fallback).toHaveProperty("modelId", "openai/gpt-6-sol");
    for (const organizationId of ["org-a", "org-b", undefined]) {
      const selected = await Reflect.apply(
        definition.events["step.started"],
        undefined,
        [
          {},
          {
            session: {
              id: "session",
              auth: {
                current: {
                  attributes: organizationId ? { organizationId } : {},
                },
                initiator: null,
              },
            },
          },
        ]
      );
      expect(selected.modelContextWindowTokens).toBe(1_050_000);
      await selected.model.doGenerate({
        prompt: [{ role: "user", content: [{ type: "text", text: "mock" }] }],
        providerOptions: selected.modelOptions.providerOptions,
      });
      expect(model.doGenerateCalls.at(-1)?.providerOptions?.gateway?.user).toBe(
        organizationId
      );
      expect(
        model.doGenerateCalls.at(-1)?.providerOptions?.gateway?.tags
      ).toEqual([tag]);
    }
  }
);
