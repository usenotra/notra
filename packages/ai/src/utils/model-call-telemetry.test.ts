import { describe, expect, mock, test } from "bun:test";

import { createModelCallTelemetry } from "./model-call-telemetry";

describe("applied model service-tier telemetry", () => {
  test.each([
    {
      metadata: { gateway: { serviceTier: "flex" }, openai: {} },
      tier: "flex",
    },
    {
      metadata: {
        gateway: { serviceTier: "default" },
        openai: { serviceTier: "flex" },
      },
      tier: "default",
    },
    {
      metadata: { gateway: {}, openai: { serviceTier: "flex" } },
      tier: "flex",
    },
    { metadata: { gateway: {}, openai: {} }, tier: undefined },
    { metadata: { gateway: { serviceTier: 1 }, openai: {} }, tier: undefined },
  ])(
    "records the applied tier $tier without assuming the requested tier",
    ({ metadata, tier }) => {
      const logger = { info: mock(), warn: mock(), error: mock() };
      const telemetry = createModelCallTelemetry({
        logger,
        request: { modelId: "openai/gpt-6-sol" },
        operation: "generate",
      });
      telemetry.complete({
        usage: {
          inputTokens: {
            total: 100,
            noCache: 60,
            cacheRead: 30,
            cacheWrite: 10,
          },
          outputTokens: { total: 20, text: 15, reasoning: 5 },
        },
        finishReason: { unified: "stop", raw: "stop" },
        providerMetadata: metadata,
      });
      expect(logger.info).toHaveBeenLastCalledWith(
        "ai.call.completed",
        expect.objectContaining({
          ai: expect.objectContaining({
            serviceTier: tier,
            cacheReadTokens: 30,
            cacheWriteTokens: 10,
            reasoningTokens: 5,
          }),
        })
      );
    }
  );
});
