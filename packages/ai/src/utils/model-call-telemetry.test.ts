import assert from "node:assert/strict";
import { test } from "node:test";

import { FREE_ORG, MODEL } from "@notra/ai/constants/router-test";
import { wrapModelWithObservability } from "@notra/ai/observability";
import { createOpenRouterAdapter } from "@notra/ai/router/adapters/openrouter";
import { createModelRouter } from "@notra/ai/router/create-router";
import {
  callOptions,
  createCaptureLogger,
  createFakeAdapter,
  createPolicy,
  createTestRouter,
  readStreamParts,
} from "@notra/ai/router/test-helpers";

import { evlogRequestIntegration } from "./evlog-request";
import { isRecord } from "./unknown-record";

test("real OpenRouter usage survives a later error and is accounted once", async () => {
  const chunks = [
    {
      id: "gen_charged_error",
      model: MODEL,
      choices: [{ index: 0, delta: { content: "partial answer" } }],
      usage: {
        prompt_tokens: 3,
        completion_tokens: 1,
        total_tokens: 4,
        cost: 0.25,
      },
    },
    { error: { message: "fixture provider error", code: 500 } },
  ];
  const adapter = createOpenRouterAdapter({
    apiKey: "fixture",
    fetch: async () =>
      new Response(
        `${chunks
          .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
          .join("")}data: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } }
      ),
  });
  const logger = createCaptureLogger();
  const router = createModelRouter({
    adapters: { openrouter: adapter },
    policy: createPolicy(),
    resolvePlan: async () => "free",
    logger,
  });
  const request = evlogRequestIntegration.start(undefined);
  await request.runWith(async () => {
    const parts = await readStreamParts(
      await router
        .model(MODEL, { organizationId: FREE_ORG })
        .doStream(callOptions())
    );
    assert.deepEqual(
      parts
        .filter((part) => ["text-delta", "error", "finish"].includes(part.type))
        .map((part) => part.type),
      ["text-delta", "error", "finish"]
    );
    const text = parts.find((part) => part.type === "text-delta");
    assert.ok(text?.type === "text-delta");
    assert.equal(text.delta, "partial answer");
    const costs = logger.entries.filter(
      ({ event }) => event === "ai.cost.reported"
    );
    assert.equal(costs.length, 1);
    assert.equal(costs[0]?.fields?.gatewayCostUsd, 0.25);
    assert.equal(costs[0]?.fields?.byokInferenceCostUsd, undefined);
    assert.equal(costs[0]?.fields?.costUsd, undefined);
    assert.equal(costs[0]?.fields?.costId, "openrouter:gen_charged_error");
    assert.deepEqual(
      logger.entries
        .filter(({ event }) => event.startsWith("ai.call."))
        .map(({ event }) => event),
      ["ai.call.started", "ai.call.failed"]
    );
    const ai = request.logger.getContext().ai;
    assert.ok(isRecord(ai));
    assert.equal(ai.calls, 1);
    assert.equal(ai.costUsd, undefined);
    const finish = parts.find((part) => part.type === "finish");
    assert.ok(finish?.type === "finish");
    assert.equal(
      router.getRouteMetadata(finish.providerMetadata)?.costUsd,
      0.25
    );
  });
});

test("OpenRouter telemetry distinguishes absent/null BYOK measurement from measured zero while billing retains its fallback", async () => {
  for (const costDetails of [
    undefined,
    null,
    { upstream_inference_cost: null },
    { upstream_inference_cost: 0 },
    { upstream_inference_cost: 0.5 },
  ]) {
    for (const operation of ["generate", "stream"] as const) {
      const response = {
        id: "gen_measurement",
        model: MODEL,
        choices: [
          {
            index: 0,
            ...(operation === "generate"
              ? {
                  message: { role: "assistant", content: "fixture answer" },
                  finish_reason: "stop",
                }
              : { delta: { content: "fixture answer" } }),
          },
        ],
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
          total_tokens: 2,
          cost: 0.25,
          cost_details: costDetails,
          is_byok: false,
        },
      };
      const adapter = createOpenRouterAdapter({
        apiKey: "fixture",
        fetch: async () =>
          operation === "generate"
            ? Response.json(response)
            : new Response(
                `data: ${JSON.stringify(response)}\n\ndata: ${JSON.stringify({
                  error: { message: "fixture later error", code: 500 },
                })}\n\ndata: [DONE]\n\n`,
                { headers: { "Content-Type": "text/event-stream" } }
              ),
      });
      const logger = createCaptureLogger();
      const router = createModelRouter({
        adapters: { openrouter: adapter },
        policy: createPolicy(),
        resolvePlan: async () => "free",
        logger,
      });
      const model = router.model(MODEL, { organizationId: FREE_ORG });
      const request = evlogRequestIntegration.start(undefined);
      const result = await request.runWith(async () =>
        operation === "generate"
          ? await model.doGenerate(callOptions())
          : (await readStreamParts(await model.doStream(callOptions()))).find(
              (part) => part.type === "finish"
            )
      );
      assert.ok(result);
      const metadata = router.getRouteMetadata(result.providerMetadata);
      const measuredCost = costDetails?.upstream_inference_cost ?? undefined;
      assert.equal(metadata?.costUsd, 0.25 + (measuredCost ?? 0));
      assert.equal(metadata?.byokInferenceCostUsd, measuredCost);
      // Chat SDK normalization drops raw is_byok, so false cannot prove zero.
      const normalizedUsage = result.providerMetadata?.openrouter?.usage;
      assert.ok(isRecord(normalizedUsage));
      assert.equal(normalizedUsage.is_byok, undefined);
      assert.equal(normalizedUsage.isByok, undefined);
      assert.equal(metadata?.isByok, undefined);
      const costs = logger.entries.filter(
        ({ event }) => event === "ai.cost.reported"
      );
      assert.equal(costs.length, 1);
      assert.equal(costs[0]?.fields?.gatewayCostUsd, 0.25);
      assert.equal(costs[0]?.fields?.byokInferenceCostUsd, measuredCost);
      assert.equal(
        costs[0]?.fields?.costUsd,
        measuredCost === undefined ? undefined : 0.25 + measuredCost
      );
      const requestAI = request.logger.getContext().ai;
      assert.ok(isRecord(requestAI));
      assert.equal(
        requestAI.costUsd,
        measuredCost === undefined ? undefined : 0.25 + measuredCost
      );
      assert.deepEqual(
        logger.entries
          .filter(({ event }) => event.startsWith("ai.call."))
          .map(({ event }) => event),
        [
          "ai.call.started",
          operation === "generate" ? "ai.call.completed" : "ai.call.failed",
        ]
      );
    }
  }
});

for (const operation of ["generate", "stream"] as const) {
  test(`direct adapter ${operation} models keep ordinary evlog usage inside a request`, async () => {
    const request = evlogRequestIntegration.start(undefined);
    await request.runWith(async () => {
      const model = wrapModelWithObservability(
        createFakeAdapter({ id: "openrouter" }).createModel(MODEL),
        request.logger
      );
      if (operation === "generate") {
        await model.doGenerate(callOptions());
      } else {
        await readStreamParts(await model.doStream(callOptions()));
      }
      const ai = request.logger.getContext().ai;
      assert.ok(isRecord(ai));
      assert.equal(ai.calls, 1);
      assert.equal(ai.model, MODEL);
      assert.equal(ai.inputTokens, 1);
      assert.equal(ai.outputTokens, 1);
      assert.equal(ai.totalTokens, 2);
      assert.equal(ai.finishReason, "stop");
    });
  });

  test(`routed ${operation} wrappers created outside the request keep interim request totals`, async () => {
    const { router } = createTestRouter();
    const request = evlogRequestIntegration.start(undefined);
    const models = [MODEL, "openai/gpt-5.4-mini"].map((modelId) =>
      wrapModelWithObservability(
        router.model(modelId, { organizationId: FREE_ORG }),
        request.logger
      )
    );
    await request.runWith(async () => {
      for (const [index, model] of models.entries()) {
        if (operation === "generate") {
          await model.doGenerate(callOptions());
        } else {
          await readStreamParts(await model.doStream(callOptions()));
        }
        const ai = request.logger.getContext().ai;
        assert.ok(isRecord(ai));
        assert.equal(ai.calls, index + 1);
        assert.equal(ai.totalTokens, (index + 1) * 2);
        assert.equal(ai.finishReason, "stop");
      }
    });
  });

  test(`request usage owns totals across separately wrapped ${operation} models`, async () => {
    const { router, logger } = createTestRouter();
    const request = evlogRequestIntegration.start(undefined);
    await request.runWith(async () => {
      for (const modelId of [MODEL, "openai/gpt-5.4-mini"]) {
        const base = router.model(modelId, { organizationId: FREE_ORG });
        const generate = base.doGenerate.bind(base);
        base.doGenerate = async (options) => {
          const result = await generate(options);
          result.content.push({
            type: "tool-call",
            toolCallId: "tool_fixture",
            toolName: "fixture_tool",
            input: "{}",
          });
          return result;
        };
        const model = wrapModelWithObservability(base, request.logger);
        if (operation === "generate") {
          await model.doGenerate(callOptions());
        } else {
          await readStreamParts(await model.doStream(callOptions()));
        }
      }
      const ai = request.logger.getContext().ai;
      assert.ok(isRecord(ai));
      assert.equal(ai.calls, 2);
      assert.equal(ai.inputTokens, 2);
      assert.equal(ai.outputTokens, 2);
      assert.equal(ai.totalTokens, 4);
      assert.deepEqual(ai.models, [MODEL, "openai/gpt-5.4-mini"]);
      assert.equal(ai.finishReason, "stop");
      if (operation === "generate") {
        assert.deepEqual(ai.toolCalls, ["fixture_tool", "fixture_tool"]);
      }
      assert.equal(
        logger.entries.filter(({ event }) => event === "ai.call.completed")
          .length,
        2
      );
    });
  });
}
