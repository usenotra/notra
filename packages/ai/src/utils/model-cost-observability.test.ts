import { beforeEach, describe, expect, mock, test } from "bun:test";

import { ROUTER_METADATA_KEY } from "@notra/ai/constants/router";
import { createModelRouter } from "@notra/ai/router/create-router";
import {
  createCaptureLogger,
  createFakeAdapter,
  createPolicy,
} from "@notra/ai/router/test-helpers";
import type { RouterLogFields } from "@notra/ai/types/router";

let requestOpen = true;
let sinkFails = false;
let requestFields: RouterLogFields[] = [];
let requestLogger = {
  set(fields: RouterLogFields) {
    if (sinkFails) {
      throw new Error("logging unavailable");
    }
    requestFields.push(fields);
  },
};

mock.module("@notra/ai/utils/evlog-request", () => ({
  getOpenRequestLogger: () => (requestOpen ? requestLogger : undefined),
}));

const { recordRequestAICost, recordRequestAIUsage } =
  await import("./request-ai-usage");
const { createModelCallTelemetry } = await import("./model-call-telemetry");

beforeEach(() => {
  requestOpen = true;
  sinkFails = false;
  requestFields = [];
  requestLogger = { ...requestLogger };
});

describe("model cost observability", () => {
  test("reported zero remains known and repeated enrichment is not added twice", () => {
    recordRequestAIUsage({
      model: "test",
      providerMetadata: {
        [ROUTER_METADATA_KEY]: { generationId: "zero", costUsd: 0 },
      },
    });
    expect(requestFields.at(-1)?.ai).toMatchObject({ costUsd: 0 });
    recordRequestAICost("zero", 0);
    recordRequestAICost("paid", 0.42);
    recordRequestAICost("paid", 0.42);
    expect(requestFields.at(-1)?.ai).toMatchObject({ costUsd: 0.42 });
  });

  test("request sink failure does not turn provider success into a retry", () => {
    sinkFails = true;
    const logger = createCaptureLogger();
    const telemetry = createModelCallTelemetry({
      logger,
      request: { modelId: "test", organizationId: "org_fixture" },
      operation: "generate",
    });
    expect(() =>
      telemetry.complete({
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 2, text: 2, reasoning: 0 },
        },
        finishReason: { unified: "stop", raw: "stop" },
        providerMetadata: {
          [ROUTER_METADATA_KEY]: {
            generationId: "completed",
            costUsd: 0.42,
            upstreamProvider: "provider",
            gatewayCostUsd: 0.02,
            upstreamInferenceCostUsd: 0.4,
            isByok: true,
          },
        },
      })
    ).not.toThrow();
    expect(logger.entries.at(-1)).toMatchObject({
      event: "ai.call.completed",
      fields: {
        generationId: "completed",
        gatewayCostUsd: 0.02,
        isByok: true,
        ai: { costUsd: 0.42 },
      },
    });
  });

  test("reported zero without a generation ID is not mistaken for absent cost", () => {
    recordRequestAIUsage({
      model: "test",
      providerMetadata: { [ROUTER_METADATA_KEY]: { costUsd: 0 } },
    });
    expect(requestFields.at(-1)?.ai).toMatchObject({ costUsd: 0 });
  });

  test("late enrichment survives a closed request and logs a correlated breakdown", async () => {
    const logger = createCaptureLogger();
    const adapter = createFakeAdapter({ id: "vercel" });
    let release = () => {};
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    adapter.lookupRouteMetadata = async () => {
      await wait;
      return {
        costUsd: 0.42,
        gatewayCostUsd: 0.02,
        upstreamInferenceCostUsd: 0.4,
        isByok: true,
        costSource: "reported",
      };
    };
    const router = createModelRouter({
      adapters: { vercel: adapter },
      resolvePlan: async () => "paid",
      policy: createPolicy(),
      logger,
    });
    const enriched = router.enrichRouteMetadata({
      gateway: "vercel",
      model: "test",
      requestedModel: "test",
      reason: "paid",
      generationId: "late",
    });
    requestOpen = false;
    release();
    expect(await enriched).toMatchObject({ costUsd: 0.42 });
    expect(requestFields).toHaveLength(0);
    expect(logger.entries.at(-1)).toMatchObject({
      event: "ai.call.cost_enriched",
      fields: {
        generationId: "late",
        gatewayCostUsd: 0.02,
        upstreamInferenceCostUsd: 0.4,
      },
    });
  });

  test("logging failures cannot discard successfully looked-up cost", async () => {
    sinkFails = true;
    const adapter = createFakeAdapter({ id: "vercel" });
    adapter.lookupRouteMetadata = async () => ({ costUsd: 0.42 });
    const router = createModelRouter({
      adapters: { vercel: adapter },
      resolvePlan: async () => "paid",
      policy: createPolicy(),
      logger: {
        info() {
          throw new Error("sink");
        },
        warn() {
          throw new Error("sink");
        },
        error() {},
      },
    });
    expect(
      await router.enrichRouteMetadata({
        gateway: "vercel",
        model: "test",
        requestedModel: "test",
        reason: "paid",
        generationId: "sink",
      })
    ).toMatchObject({ costUsd: 0.42 });
  });
});
