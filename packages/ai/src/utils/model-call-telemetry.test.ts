import assert from "node:assert/strict";
import { test } from "node:test";

import { FREE_ORG, MODEL } from "@notra/ai/constants/router-test";
import { createOpenRouterAdapter } from "@notra/ai/router/adapters/openrouter";
import { createModelRouter } from "@notra/ai/router/create-router";
import {
  callOptions,
  createCaptureLogger,
  createPolicy,
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
    assert.equal(costs[0]?.fields?.costUsd, 0.25);
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
    assert.equal(ai.costUsd, 0.25);
  });
});
