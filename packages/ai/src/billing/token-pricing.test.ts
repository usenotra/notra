import { describe, expect, test } from "bun:test";

import {
  AGENT_DEFAULT_MODEL,
  CONTENT_AGENT_MODEL,
  GEO_WRITER_MODEL,
  GEO_WRITER_PLANNER_MODEL,
  UTILITY_MODEL_ID,
} from "../constants/models";
import {
  IMAGE_GEN_MODEL_ID,
  IMAGE_REVIEW_MODEL_ID,
} from "../constants/repo-image";
import {
  calculateTokenCostUsd,
  getModelPricing,
  MODEL_PRICING,
} from "./token-pricing";

const agentModels = await import(
  new URL(
    "../../../../apps/agent/agent/lib/constants/models.ts",
    import.meta.url
  ).href
);

describe("agent model token pricing", () => {
  test.each([
    "anthropic/claude-sonnet-5.5",
    "vercel/anthropic/claude-sonnet-5.5",
  ])("prices every Sonnet 5.5 token bucket for %s", (modelId) => {
    expect(getModelPricing(modelId)).toEqual({
      inputPerMillionTokens: 2,
      outputPerMillionTokens: 10,
      cacheReadPerMillionTokens: 0.2,
      cacheWritePerMillionTokens: 2.5,
    });
    expect(
      calculateTokenCostUsd(
        {
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          cacheReadTokens: 1_000_000,
          cacheWriteTokens: 1_000_000,
          totalTokens: 4_000_000,
        },
        modelId,
        "vercel"
      )
    ).toBeCloseTo(14.7);
  });

  test.each([
    agentModels.ASSISTANT_MODEL_ID,
    agentModels.ASSISTANT_FAST_MODEL_ID,
    agentModels.ASSISTANT_DEEP_MODEL_ID,
    agentModels.ASSISTANT_TASK_MODEL_ID,
    agentModels.CONTENT_WRITER_MODEL_ID,
    agentModels.IMAGE_DESIGNER_MODEL_ID,
    AGENT_DEFAULT_MODEL,
    CONTENT_AGENT_MODEL,
    GEO_WRITER_MODEL,
    GEO_WRITER_PLANNER_MODEL,
    UTILITY_MODEL_ID,
    IMAGE_GEN_MODEL_ID,
    IMAGE_REVIEW_MODEL_ID,
  ])(
    "has explicit pricing for the selected agent model %s",
    (modelId: string) => {
      const pricing = MODEL_PRICING[modelId];
      expect(pricing).toBeDefined();
      if (pricing) {
        expect(getModelPricing(modelId)).toEqual(pricing);
      }
    }
  );
});
