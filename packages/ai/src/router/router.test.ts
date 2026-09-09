import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";
import {
  ROUTER_METADATA_KEY,
  ROUTER_PROVIDER_OPTIONS_KEY,
} from "@notra/ai/constants/router";
import type { ZdrMode } from "@notra/ai/types/router";

import { createOpenRouterAdapter } from "./adapters/openrouter";
import { createVercelAdapter } from "./adapters/vercel";
import {
  GatewayCreditBalanceError,
  GatewayNotConfiguredError,
  NoCompliantRouteError,
  UnsupportedModelError,
} from "./errors";
import { classifyUpstreamFailure } from "./lazy-model";
import {
  callOptions,
  createFakeAdapter,
  createTestRouter,
  httpError,
  readStreamParts,
} from "./test-helpers";

const PAID_ORG = "org_paid";
const FREE_ORG = "org_free";
const MODEL = "anthropic/claude-sonnet-4.6";
const CREDIT_TTL_MS = 30_000;

const plans = { [PAID_ORG]: "paid", [FREE_ORG]: "free" } as const;

describe("Vercel adapter metadata", () => {
  test("uses generationId metadata and resolves documented generation info", async () => {
    const requestedUrls: string[] = [];
    const generationFetch: typeof fetch = (input) => {
      requestedUrls.push(String(input));
      return Promise.resolve(
        Response.json({
          data: {
            id: "gen_test",
            total_cost: 0.001,
            upstream_inference_cost: 0.001,
            usage: 0.001,
            created_at: "2026-08-17T00:00:00.000Z",
            model: MODEL,
            is_byok: false,
            provider_name: "anthropic",
            streamed: true,
            finish_reason: "stop",
            latency: 100,
            generation_time: 500,
            native_tokens_prompt: 10,
            native_tokens_completion: 20,
            native_tokens_reasoning: 0,
            native_tokens_cached: 0,
            native_tokens_cache_creation: 0,
            billable_web_search_calls: 0,
          },
        })
      );
    };
    const adapter = createVercelAdapter({
      apiKey: "test-key",
      baseURL: "https://gateway.test/v1/ai",
      fetch: generationFetch,
    });

    assert.deepEqual(
      adapter.extractRouteMetadata({ gateway: { generationId: "gen_test" } }),
      { generationId: "gen_test" }
    );
    assert.ok(adapter.lookupRouteMetadata);
    assert.deepEqual(await adapter.lookupRouteMetadata("gen_test"), {
      model: MODEL,
      upstreamProvider: "anthropic",
    });
    assert.equal(
      requestedUrls[0],
      "https://gateway.test/v1/generation?id=gen_test"
    );
  });
});

function metadataOf(result: { providerMetadata?: Record<string, unknown> }) {
  return result.providerMetadata?.[ROUTER_METADATA_KEY] as
    | Record<string, unknown>
    | undefined;
}

describe("resolveRoute", () => {
  test("paid organization → vercel, free organization → openrouter", async () => {
    const { router } = createTestRouter({ plans });
    const paid = await router.resolveRoute({
      modelId: MODEL,
      organizationId: PAID_ORG,
    });
    const free = await router.resolveRoute({
      modelId: MODEL,
      organizationId: FREE_ORG,
    });
    assert.equal(paid.gateway, "vercel");
    assert.equal(paid.plan, "paid");
    assert.equal(paid.reason, "paid");
    assert.equal(free.gateway, "openrouter");
    assert.equal(free.reason, "free");
    assert.equal(free.zdrEnforced, true);
  });

  test("resolves independent plan and ZDR lookups concurrently", async () => {
    let releasePlan: (() => void) | undefined;
    const planPending = new Promise<void>((resolve) => {
      releasePlan = resolve;
    });
    let zdrStarted = false;
    const { router } = createTestRouter({
      resolvePlan: async () => {
        await planPending;
        return "paid";
      },
      resolveZdr: () => {
        zdrStarted = true;
        return Promise.resolve("required");
      },
    });

    const routePending = router.resolveRoute({
      modelId: MODEL,
      organizationId: PAID_ORG,
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    assert.equal(zdrStarted, true);
    releasePlan?.();
    assert.equal((await routePending).gateway, "vercel");
  });

  test("ZDR entitlements are isolated by organization and refreshed at expiry", async () => {
    let now = 0;
    const modes: Record<string, ZdrMode> = {
      [PAID_ORG]: "required",
      [FREE_ORG]: "none",
    };
    const lookups: string[] = [];
    const { router } = createTestRouter({
      plans,
      now: () => now,
      planCacheTtlMs: 1000,
      resolveZdr: (organizationId) => {
        lookups.push(organizationId);
        return Promise.resolve(modes[organizationId] ?? "required");
      },
    });
    assert.equal(
      (await router.resolveRoute({ modelId: MODEL, organizationId: PAID_ORG }))
        .zdr,
      "required"
    );
    assert.equal(
      (await router.resolveRoute({ modelId: MODEL, organizationId: FREE_ORG }))
        .zdr,
      "none"
    );
    modes[FREE_ORG] = "required";
    now = 999;
    assert.equal(
      (await router.resolveRoute({ modelId: MODEL, organizationId: FREE_ORG }))
        .zdr,
      "none"
    );
    assert.deepEqual(lookups, [PAID_ORG, FREE_ORG]);
    now = 1000;
    assert.equal(
      (await router.resolveRoute({ modelId: MODEL, organizationId: FREE_ORG }))
        .zdr,
      "required"
    );
    assert.deepEqual(lookups, [PAID_ORG, FREE_ORG, FREE_ORG]);
  });

  test("ZDR lookup failures fail closed without caching the failure; explicit modes bypass lookup", async () => {
    let lookups = 0;
    const { router, logger } = createTestRouter({
      resolveZdr: () => {
        lookups += 1;
        return lookups === 1
          ? Promise.reject(new Error("entitlements unavailable"))
          : Promise.resolve("none");
      },
    });
    const request = { modelId: MODEL, organizationId: PAID_ORG };
    assert.equal(
      (await router.resolveRoute({ ...request, zdr: "preferred" })).zdr,
      "preferred"
    );
    assert.equal(
      (await router.resolveRoute({ modelId: MODEL })).zdr,
      "required"
    );
    assert.equal(lookups, 0);
    assert.equal((await router.resolveRoute(request)).zdr, "required");
    assert.ok(
      logger.entries.some(
        (entry) => entry.event === "ai.router.zdr_lookup_failed"
      )
    );
    assert.equal((await router.resolveRoute(request)).zdr, "none");
    assert.equal(lookups, 2);
  });

  test("missing organization context uses the default gateway", async () => {
    const { router, planLookups } = createTestRouter({ plans });
    const decision = await router.resolveRoute({ modelId: MODEL });
    assert.equal(decision.gateway, "openrouter");
    assert.equal(decision.reason, "no-org-default");
    assert.equal(decision.plan, undefined);
    assert.deepEqual(planLookups, []);
  });

  test("plan lookups are cached for the TTL", async () => {
    let now = 0;
    const { router, planLookups } = createTestRouter({
      plans,
      now: () => now,
      planCacheTtlMs: 1000,
    });
    await router.resolveRoute({ modelId: MODEL, organizationId: PAID_ORG });
    await router.resolveRoute({ modelId: MODEL, organizationId: PAID_ORG });
    assert.deepEqual(planLookups, [PAID_ORG]);
    now = 1001;
    const decision = await router.resolveRoute({
      modelId: MODEL,
      organizationId: PAID_ORG,
    });
    assert.deepEqual(planLookups, [PAID_ORG, PAID_ORG]);
    assert.equal(decision.planSource, "resolver");
  });

  test("plan lookup failure falls back to free and logs", async () => {
    const { router, logger } = createTestRouter({
      resolvePlan: () => Promise.reject(new Error("autumn down")),
    });
    const decision = await router.resolveRoute({
      modelId: MODEL,
      organizationId: PAID_ORG,
    });
    assert.equal(decision.plan, "free");
    assert.equal(decision.planSource, "default");
    assert.ok(
      logger.entries.some(
        (entry) => entry.event === "ai.router.plan_lookup_failed"
      )
    );
  });

  test("missing openrouter key: free org falls back to vercel with reason", async () => {
    const { router, logger } = createTestRouter({ plans, openrouter: null });
    const decision = await router.resolveRoute({
      modelId: MODEL,
      organizationId: FREE_ORG,
    });
    assert.equal(decision.gateway, "vercel");
    assert.equal(decision.reason, "fallback");
    assert.equal(decision.fallbackFrom, "openrouter");
    assert.equal(decision.fallbackReason, "not-configured");
    assert.ok(
      logger.entries.some((entry) => entry.event === "ai.router.fallback")
    );
  });

  test("disabled fallback surfaces an unavailable preferred gateway", async () => {
    const { router } = createTestRouter({
      plans,
      openrouter: null,
      policy: { crossGatewayFallback: false },
    });
    await assert.rejects(
      router.resolveRoute({ modelId: MODEL, organizationId: FREE_ORG }),
      GatewayNotConfiguredError
    );
  });

  test("no configured gateway at all fails with GatewayNotConfiguredError", async () => {
    const { router } = createTestRouter({ vercel: null, openrouter: null });
    await assert.rejects(
      router.resolveRoute({ modelId: MODEL, organizationId: FREE_ORG }),
      GatewayNotConfiguredError
    );
  });

  test("unsupported model on the preferred gateway falls back to the other", async () => {
    const openrouter = createFakeAdapter({
      id: "openrouter",
      supportedModels: (modelId) => modelId !== "vercel/only-model",
    });
    const { router } = createTestRouter({ plans, openrouter });
    const decision = await router.resolveRoute({
      modelId: "vercel/only-model",
      organizationId: FREE_ORG,
    });
    assert.equal(decision.gateway, "vercel");
    assert.equal(decision.fallbackReason, "unsupported-model");
  });

  test("model unsupported everywhere throws UnsupportedModelError", async () => {
    const vercel = createFakeAdapter({
      id: "vercel",
      supportedModels: () => false,
    });
    const openrouter = createFakeAdapter({
      id: "openrouter",
      supportedModels: () => false,
    });
    const { router } = createTestRouter({ plans, vercel, openrouter });
    await assert.rejects(
      router.resolveRoute({ modelId: "nope/model", organizationId: FREE_ORG }),
      UnsupportedModelError
    );
  });

  test("empty ZDR provider set fails closed", async () => {
    const vercel = createFakeAdapter({ id: "vercel", enforcesZdr: false });
    const openrouter = createFakeAdapter({
      id: "openrouter",
      enforcesZdr: false,
    });
    const { router, logger } = createTestRouter({ plans, vercel, openrouter });
    await assert.rejects(
      router.resolveRoute({ modelId: MODEL, organizationId: PAID_ORG }),
      NoCompliantRouteError
    );
    assert.ok(
      logger.entries.some(
        (entry) => entry.event === "ai.router.no_compliant_route"
      )
    );
  });

  test("non-compliant preferred gateway falls back to the compliant one", async () => {
    const openrouter = createFakeAdapter({
      id: "openrouter",
      enforcesZdr: false,
    });
    const { router } = createTestRouter({ plans, openrouter });
    const decision = await router.resolveRoute({
      modelId: MODEL,
      organizationId: FREE_ORG,
    });
    assert.equal(decision.gateway, "vercel");
    assert.equal(decision.fallbackReason, "non-compliant");
    assert.equal(decision.zdrEnforced, true);
  });

  test("development bypass allows a non-ZDR route and logs it", async () => {
    const openrouter = createFakeAdapter({
      id: "openrouter",
      enforcesZdr: false,
    });
    const { router, logger } = createTestRouter({
      plans,
      openrouter,
      policy: { allowNonZdr: true },
    });
    const decision = await router.resolveRoute({
      modelId: MODEL,
      organizationId: FREE_ORG,
    });
    assert.equal(decision.gateway, "openrouter");
    assert.equal(decision.zdrEnforced, false);
    assert.ok(
      logger.entries.some((entry) => entry.event === "ai.router.zdr_bypassed")
    );
  });

  test("pinned gateway is honoured and never falls back", async () => {
    const { router } = createTestRouter({ plans });
    const decision = await router.resolveRoute({
      modelId: MODEL,
      organizationId: FREE_ORG,
      gateway: "vercel",
    });
    assert.equal(decision.gateway, "vercel");
    assert.equal(decision.reason, "pinned");

    const { router: withoutVercel } = createTestRouter({ plans, vercel: null });
    await assert.rejects(
      withoutVercel.resolveRoute({ modelId: MODEL, gateway: "vercel" }),
      GatewayNotConfiguredError
    );
  });
});

describe("RoutedLanguageModel", () => {
  test("resolves lazily once for concurrent and subsequent calls", async () => {
    const { router, openrouter, planLookups } = createTestRouter({ plans });
    assert.ok(openrouter);
    const model = router.model(MODEL, { organizationId: FREE_ORG });
    assert.equal(model.provider, "notra-router");
    assert.equal(model.modelId, MODEL);
    assert.deepEqual(planLookups, []);
    assert.deepEqual(openrouter.createdModels, []);

    await Promise.all([
      model.doGenerate(callOptions()),
      model.doGenerate(callOptions()),
      Promise.resolve(model.supportedUrls),
    ]);
    await model.doGenerate(callOptions());
    assert.deepEqual(planLookups, [FREE_ORG]);
    assert.deepEqual(openrouter.createdModels, [MODEL]);
    assert.equal(openrouter.calls.length, 3);
  });

  test("retries resolution after a failed first attempt", async () => {
    let available = false;
    const openrouter = createFakeAdapter({
      id: "openrouter",
      supportedModels: () => available,
    });
    const { router } = createTestRouter({ plans, openrouter, vercel: null });
    const model = router.model(MODEL, { organizationId: FREE_ORG });
    await assert.rejects(
      async () => await model.doGenerate(callOptions()),
      UnsupportedModelError
    );
    assert.deepEqual(openrouter.createdModels, []);

    available = true;
    const result = await model.doGenerate(callOptions());
    assert.equal(metadataOf(result)?.gateway, "openrouter");
    assert.deepEqual(openrouter.createdModels, [MODEL]);
    assert.equal(openrouter.calls.length, 1);
  });

  test("supportedUrls is lazy and resolves through the routed model", async () => {
    const { router, planLookups } = createTestRouter({ plans });
    const model = router.model(MODEL, { organizationId: FREE_ORG });
    const eager = model.supportedUrls;
    assert.deepEqual(planLookups, []);
    assert.deepEqual(await eager, {});
    assert.deepEqual(planLookups, [FREE_ORG]);
  });

  test("openrouter calls carry ZDR provider options and no vercel block", async () => {
    const { router, openrouter } = createTestRouter({ plans });
    const model = router.model(MODEL, { organizationId: FREE_ORG });
    await model.doGenerate(
      callOptions({
        gateway: { models: ["leak"] },
        [ROUTER_PROVIDER_OPTIONS_KEY]: {
          caching: "auto",
          fallbackModels: ["anthropic/claude-haiku-4.5"],
        },
        anthropic: {
          thinking: { type: "adaptive" },
          output_config: { effort: "high" },
        },
      })
    );
    const sent = openrouter?.calls[0]?.options.providerOptions ?? {};
    assert.equal("gateway" in sent, false);
    assert.equal(ROUTER_PROVIDER_OPTIONS_KEY in sent, false);
    const openrouterOptions = sent.openrouter as Record<string, unknown>;
    assert.deepEqual(openrouterOptions.provider, {
      zdr: true,
      data_collection: "deny",
    });
    assert.deepEqual(openrouterOptions.models, ["anthropic/claude-haiku-4.5"]);
    assert.deepEqual(openrouterOptions.reasoning, { effort: "high" });
    assert.ok(sent.anthropic, "vendor block passes through");
  });

  test("vercel calls carry zeroDataRetention/disallowPromptTraining and no openrouter block", async () => {
    const { router, vercel } = createTestRouter({ plans });
    const model = router.model(MODEL, { organizationId: PAID_ORG });
    await model.doGenerate(
      callOptions({
        openrouter: { provider: { zdr: false } },
        [ROUTER_PROVIDER_OPTIONS_KEY]: {
          caching: "auto",
          fallbackModels: ["anthropic/claude-haiku-4.5"],
        },
      })
    );
    const sent = vercel?.calls[0]?.options.providerOptions ?? {};
    assert.equal("openrouter" in sent, false);
    const gatewayOptions = sent.gateway as Record<string, unknown>;
    assert.equal(gatewayOptions.zeroDataRetention, true);
    assert.equal(gatewayOptions.disallowPromptTraining, true);
    assert.equal(gatewayOptions.caching, "auto");
    assert.deepEqual(gatewayOptions.models, ["anthropic/claude-haiku-4.5"]);
  });

  test("callers cannot downgrade privacy flags in production", async () => {
    const { router, vercel, openrouter } = createTestRouter({ plans });
    await router.model(MODEL, { organizationId: PAID_ORG }).doGenerate(
      callOptions({
        gateway: { zeroDataRetention: false, disallowPromptTraining: false },
      })
    );
    const vercelSent = vercel?.calls[0]?.options.providerOptions
      ?.gateway as Record<string, unknown>;
    assert.equal(vercelSent.zeroDataRetention, true);
    assert.equal(vercelSent.disallowPromptTraining, true);

    await router.model(MODEL, { organizationId: FREE_ORG }).doGenerate(
      callOptions({
        openrouter: { provider: { zdr: false, data_collection: "allow" } },
      })
    );
    const openrouterSent = openrouter?.calls[0]?.options.providerOptions
      ?.openrouter as Record<string, unknown>;
    assert.deepEqual(openrouterSent.provider, {
      zdr: true,
      data_collection: "deny",
    });
  });

  test("annotates generate results with route metadata", async () => {
    const { router } = createTestRouter({ plans });
    const result = await router
      .model(MODEL, { organizationId: FREE_ORG })
      .doGenerate(callOptions());
    const metadata = metadataOf(result);
    assert.equal(metadata?.gateway, "openrouter");
    assert.equal(metadata?.requestedModel, MODEL);
    assert.equal(metadata?.plan, "free");
    assert.equal(metadata?.upstreamProvider, "Amazon Bedrock");
    assert.equal(
      router.getRouteMetadata(result.providerMetadata)?.gateway,
      "openrouter"
    );
  });

  test("annotates the stream finish part with route metadata", async () => {
    const { router } = createTestRouter({ plans });
    const result = await router
      .model(MODEL, { organizationId: PAID_ORG })
      .doStream(callOptions());
    const parts = await readStreamParts(result);
    const finish = parts.find((part) => part.type === "finish");
    assert.ok(finish && finish.type === "finish");
    const metadata = finish.providerMetadata?.[ROUTER_METADATA_KEY] as
      | Record<string, unknown>
      | undefined;
    assert.equal(metadata?.gateway, "vercel");
    assert.equal(metadata?.generationId, "gen_test");
    assert.equal(metadata?.upstreamProvider, undefined);
  });

  test("enriches vercel metadata through the generation lookup API", async () => {
    const { router } = createTestRouter({ plans });
    const result = await router
      .model(MODEL, { organizationId: PAID_ORG })
      .doGenerate(callOptions());
    const metadata = router.getRouteMetadata(result.providerMetadata);
    assert.ok(metadata);
    const enriched = await router.enrichRouteMetadata(metadata);
    assert.equal(enriched.generationId, "gen_test");
    assert.equal(enriched.upstreamProvider, "anthropic");
  });

  test("upstream outage on openrouter falls back to vercel with ZDR preserved", async () => {
    let failures = 0;
    const openrouter = createFakeAdapter({
      id: "openrouter",
      onCall: () => {
        failures += 1;
        throw httpError(503);
      },
    });
    const { router, vercel, logger } = createTestRouter({ plans, openrouter });
    const model = router.model(MODEL, { organizationId: FREE_ORG });
    const result = await model.doGenerate(callOptions());
    assert.equal(failures, 1);
    assert.equal(vercel?.calls.length, 1);
    const vercelSent = vercel?.calls[0]?.options.providerOptions
      ?.gateway as Record<string, unknown>;
    assert.equal(vercelSent.zeroDataRetention, true);
    const metadata = metadataOf(result);
    assert.equal(metadata?.gateway, "vercel");
    assert.equal(metadata?.fallbackFrom, "openrouter");
    assert.equal(metadata?.fallbackReason, "upstream-error");
    assert.equal(metadata?.plan, "free");
    assert.ok(
      logger.entries.some((entry) => entry.event === "ai.router.fallback")
    );

    // Subsequent calls stay on the fallback gateway.
    await model.doGenerate(callOptions());
    assert.equal(failures, 1);
    assert.equal(vercel?.calls.length, 2);
  });

  test("streams fall back when the upstream fails before the stream starts", async () => {
    const openrouter = createFakeAdapter({
      id: "openrouter",
      onCall: () => {
        throw httpError(429);
      },
    });
    const { router, vercel } = createTestRouter({ plans, openrouter });
    const result = await router
      .model(MODEL, { organizationId: FREE_ORG })
      .doStream(callOptions());
    const parts = await readStreamParts(result);
    assert.equal(vercel?.calls.length, 1);
    const finish = parts.find((part) => part.type === "finish");
    assert.ok(finish && finish.type === "finish");
    const metadata = finish.providerMetadata?.[ROUTER_METADATA_KEY] as
      | Record<string, unknown>
      | undefined;
    assert.equal(metadata?.fallbackFrom, "openrouter");
  });

  test("a stream error after emitted text surfaces without starting a fallback", async () => {
    let controller:
      | ReadableStreamDefaultController<LanguageModelV3StreamPart>
      | undefined;
    const openrouter = createFakeAdapter({ id: "openrouter" });
    const createModel = openrouter.createModel;
    openrouter.createModel = (modelId) => {
      const model = createModel(modelId);
      return {
        ...model,
        async doStream(options) {
          const result = await model.doStream(options);
          return {
            ...result,
            stream: new ReadableStream<LanguageModelV3StreamPart>({
              start(upstream) {
                controller = upstream;
              },
            }),
          };
        },
      };
    };
    const { router, vercel } = createTestRouter({ plans, openrouter });
    assert.ok(vercel);
    const result = await router
      .model(MODEL, { organizationId: FREE_ORG })
      .doStream(callOptions());
    const reader = result.stream.getReader();
    assert.ok(controller);
    controller.enqueue({
      type: "text-delta",
      id: "t",
      delta: "Partial answer",
    });
    assert.deepEqual(await reader.read(), {
      done: false,
      value: { type: "text-delta", id: "t", delta: "Partial answer" },
    });
    const error = httpError(503);
    const failedRead = assert.rejects(
      reader.read(),
      (caught) => caught === error
    );
    controller.error(error);
    await failedRead;
    reader.releaseLock();
    assert.equal(openrouter.calls.length, 1);
    assert.equal(vercel.calls.length, 0);
  });

  test("pinned requests preserve upstream errors without fallback for generate and stream", async () => {
    const error = httpError(503);
    const openrouter = createFakeAdapter({
      id: "openrouter",
      onCall: () => {
        throw error;
      },
    });
    const { router, vercel } = createTestRouter({ plans, openrouter });
    assert.ok(vercel);
    const model = router.model(MODEL, {
      organizationId: PAID_ORG,
      gateway: "openrouter",
    });
    await assert.rejects(
      async () => await model.doGenerate(callOptions()),
      (caught) => caught === error
    );
    await assert.rejects(
      async () => await model.doStream(callOptions()),
      (caught) => caught === error
    );
    assert.equal(openrouter.calls.length, 2);
    assert.equal(vercel.calls.length, 0);
  });

  test("non-retryable errors surface without fallback", async () => {
    const openrouter = createFakeAdapter({
      id: "openrouter",
      onCall: () => {
        throw httpError(400, "bad request");
      },
    });
    const { router, vercel } = createTestRouter({ plans, openrouter });
    await assert.rejects(async () => {
      await router
        .model(MODEL, { organizationId: FREE_ORG })
        .doGenerate(callOptions());
    }, /bad request/);
    assert.equal(vercel?.calls.length, 0);
  });

  test("no fallback when the other gateway is not ZDR compliant", async () => {
    const openrouter = createFakeAdapter({
      id: "openrouter",
      onCall: () => {
        throw httpError(503);
      },
    });
    const vercel = createFakeAdapter({ id: "vercel", enforcesZdr: false });
    const { router, logger } = createTestRouter({ plans, openrouter, vercel });
    await assert.rejects(async () => {
      await router
        .model(MODEL, { organizationId: FREE_ORG })
        .doGenerate(callOptions());
    }, /upstream failed/);
    assert.equal(vercel.calls.length, 0);
    assert.ok(
      logger.entries.some(
        (entry) => entry.event === "ai.router.no_compliant_route"
      )
    );
  });

  test("cross-gateway fallback can be disabled", async () => {
    const openrouter = createFakeAdapter({
      id: "openrouter",
      onCall: () => {
        throw httpError(503);
      },
    });
    const { router, vercel } = createTestRouter({
      plans,
      openrouter,
      policy: { crossGatewayFallback: false },
    });
    await assert.rejects(async () => {
      await router
        .model(MODEL, { organizationId: FREE_ORG })
        .doGenerate(callOptions());
    });
    assert.equal(vercel?.calls.length, 0);
  });

  test("a 402 marks the gateway exhausted so later routes avoid it", async () => {
    const openrouter = createFakeAdapter({
      id: "openrouter",
      balance: 0,
      onCall: () => {
        throw httpError(402, "insufficient credits");
      },
    });
    const { router, vercel } = createTestRouter({ plans, openrouter });
    await router
      .model(MODEL, { organizationId: FREE_ORG })
      .doGenerate(callOptions());
    assert.equal(vercel?.calls.length, 1);
    const next = await router.resolveRoute({
      modelId: MODEL,
      organizationId: FREE_ORG,
    });
    assert.equal(next.gateway, "vercel");
    assert.equal(next.fallbackReason, "no-credits");
  });

  test("a spurious 402 heals once the balance check reports credits", async () => {
    const openrouter = createFakeAdapter({
      id: "openrouter",
      onCall: () => {
        throw httpError(402, "insufficient credits");
      },
    });
    const { router } = createTestRouter({ plans, openrouter });
    await router
      .model(MODEL, { organizationId: FREE_ORG })
      .doGenerate(callOptions());
    assert.equal(openrouter.balanceCalls, 1);
    const next = await router.resolveRoute({
      modelId: MODEL,
      organizationId: FREE_ORG,
    });
    assert.equal(next.gateway, "openrouter");
    assert.equal(next.fallbackReason, undefined);
  });
});

describe("development ZDR bypass", () => {
  test("OpenRouter omits ZDR in development unless requested or explicitly relaxed", async () => {
    const { router, openrouter } = createTestRouter({
      plans,
      policy: { allowNonZdr: true },
    });
    await router
      .model(MODEL, { gateway: "openrouter", zdr: "required" })
      .doGenerate(callOptions());
    await router
      .model(MODEL, { gateway: "openrouter", zdr: "required" })
      .doGenerate(callOptions({ openrouter: { provider: { zdr: true } } }));
    await router
      .model(MODEL, { gateway: "openrouter", zdr: "none" })
      .doGenerate(callOptions());
    assert.deepEqual(
      openrouter?.calls.map(
        (call) => call.options.providerOptions?.openrouter?.provider
      ),
      [
        { data_collection: "deny" },
        { zdr: true, data_collection: "deny" },
        { zdr: false, data_collection: "allow" },
      ]
    );
  });

  test("omits ZDR flags unless the caller sets them, keeps no-training on", async () => {
    const { router, vercel, openrouter } = createTestRouter({
      plans,
      policy: { allowNonZdr: true },
    });
    await router
      .model(MODEL, { organizationId: PAID_ORG })
      .doGenerate(callOptions());
    const vercelSent = vercel?.calls[0]?.options.providerOptions
      ?.gateway as Record<string, unknown>;
    assert.equal("zeroDataRetention" in vercelSent, false);
    assert.equal(vercelSent.disallowPromptTraining, true);

    await router
      .model(MODEL, { organizationId: FREE_ORG })
      .doGenerate(callOptions({ openrouter: { provider: { zdr: true } } }));
    const openrouterSent = openrouter?.calls[0]?.options.providerOptions
      ?.openrouter as Record<string, unknown>;
    assert.deepEqual(openrouterSent.provider, {
      zdr: true,
      data_collection: "deny",
    });
  });
});

describe("ZDR rejection by a gateway", () => {
  test("a 403 ZDR error falls back to the compliant gateway and marks the route", async () => {
    const vercel = createFakeAdapter({
      id: "vercel",
      onCall: () => {
        throw httpError(
          403,
          "Zero Data Retention (ZDR) is only available for Pro and Enterprise plans."
        );
      },
    });
    let now = 0;
    const { router, openrouter, logger } = createTestRouter({
      plans,
      vercel,
      now: () => now,
    });
    const result = await router
      .model(MODEL, { organizationId: PAID_ORG, zdr: "required" })
      .doGenerate(callOptions());
    assert.equal(vercel.calls.length, 1);
    assert.equal(openrouter?.calls.length, 1);
    const metadata = metadataOf(result);
    assert.equal(metadata?.gateway, "openrouter");
    assert.equal(metadata?.fallbackReason, "non-compliant");
    assert.ok(
      logger.entries.some((entry) => entry.event === "ai.router.zdr_rejected")
    );

    // Later routes skip the non-compliant gateway without another roundtrip.
    const next = await router.resolveRoute({
      modelId: MODEL,
      organizationId: PAID_ORG,
    });
    assert.equal(next.gateway, "openrouter");
    assert.equal(next.fallbackReason, "non-compliant");

    assert.equal(
      (
        await router.resolveRoute({
          modelId: "anthropic/claude-haiku-4.5",
          organizationId: PAID_ORG,
        })
      ).gateway,
      "vercel",
      "the rejection must not disable unrelated models"
    );

    // Pinned requests to the non-compliant gateway fail closed.
    await assert.rejects(
      router.resolveRoute({ modelId: MODEL, gateway: "vercel" }),
      NoCompliantRouteError
    );
    now = 5 * 60_000;
    assert.equal(
      (await router.resolveRoute({ modelId: MODEL, organizationId: PAID_ORG }))
        .gateway,
      "vercel",
      "the unavailable mark expires"
    );
  });
});

describe("zdr: preferred", () => {
  test("when neither gateway supports ZDR, preferred relaxes but required fails closed", async () => {
    const vercel = createFakeAdapter({ id: "vercel", enforcesZdr: false });
    const openrouter = createFakeAdapter({
      id: "openrouter",
      enforcesZdr: false,
    });
    const { router } = createTestRouter({ plans, vercel, openrouter });
    await assert.rejects(
      async () =>
        await router
          .model(MODEL, { organizationId: PAID_ORG, zdr: "required" })
          .doGenerate(callOptions()),
      NoCompliantRouteError
    );
    assert.equal(vercel.calls.length + openrouter.calls.length, 0);
    const result = await router
      .model(MODEL, { organizationId: PAID_ORG, zdr: "preferred" })
      .doGenerate(callOptions());
    assert.equal(metadataOf(result)?.zdrEnforced, false);
    assert.equal(metadataOf(result)?.gateway, "vercel");
    assert.equal(
      vercel.calls[0]?.options.providerOptions?.gateway?.zeroDataRetention,
      undefined
    );
    assert.equal(
      vercel.calls[0]?.options.providerOptions?.gateway?.disallowPromptTraining,
      false
    );
    assert.equal(vercel.calls.length, 1);
    assert.equal(openrouter.calls.length, 0);
  });

  test("preferred retries without ZDR only when no compliant fallback exists, without weakening strict requests", async () => {
    const vercel = createFakeAdapter({
      id: "vercel",
      onCall: (call) => {
        if (call.options.providerOptions?.gateway?.zeroDataRetention === true) {
          throw httpError(403, "No ZDR providers available");
        }
      },
    });
    const openrouter = createFakeAdapter({
      id: "openrouter",
      enforcesZdr: false,
    });
    const { router } = createTestRouter({ plans, vercel, openrouter });
    const model = router.model(MODEL, {
      organizationId: PAID_ORG,
      zdr: "preferred",
    });
    const result = await model.doGenerate(callOptions());
    assert.equal(metadataOf(result)?.zdrEnforced, false);
    assert.equal(metadataOf(result)?.gateway, "vercel");
    await model.doGenerate(callOptions());
    assert.deepEqual(
      vercel.calls.map(
        (call) => call.options.providerOptions?.gateway?.zeroDataRetention
      ),
      [true, undefined, undefined]
    );
    assert.deepEqual(
      vercel.calls.map(
        (call) => call.options.providerOptions?.gateway?.disallowPromptTraining
      ),
      [true, false, false]
    );
    await assert.rejects(
      async () =>
        await router
          .model(MODEL, { organizationId: PAID_ORG, zdr: "required" })
          .doGenerate(callOptions()),
      NoCompliantRouteError
    );
    assert.equal(vercel.calls.length, 3);
    assert.equal(openrouter.calls.length, 0);
  });

  test("openrouter 'no endpoints matching your data policy' is a ZDR rejection", async () => {
    const openrouter = createFakeAdapter({
      id: "openrouter",
      onCall: (call) => {
        const block = call.options.providerOptions?.openrouter as
          | { provider?: Record<string, unknown> }
          | undefined;
        if (block?.provider?.zdr === true) {
          throw httpError(
            404,
            "No endpoints found matching your data policy (Zero data retention)."
          );
        }
      },
    });
    const { router, vercel } = createTestRouter({ plans, openrouter });
    const result = await router
      .model(MODEL, { organizationId: FREE_ORG, zdr: "preferred" })
      .doGenerate(callOptions());

    assert.equal(openrouter.calls.length, 1);
    assert.equal(vercel?.calls.length, 1);
    const metadata = metadataOf(result);
    assert.equal(metadata?.gateway, "vercel");
    assert.equal(metadata?.fallbackReason, "non-compliant");
    assert.equal(metadata?.zdrEnforced, true);
  });
});

describe("assertRouteHasCredits", () => {
  test("a failed balance lookup allows traffic, caches unknown balance, and retries at expiry", async () => {
    let now = 0;
    const openrouter = createFakeAdapter({ id: "openrouter", balance: 10 });
    const getBalance = openrouter.getBalance;
    let attempts = 0;
    openrouter.getBalance = () => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error("balance endpoint unavailable"))
        : getBalance();
    };
    const { router, logger } = createTestRouter({
      plans,
      openrouter,
      now: () => now,
      creditCheckTtlMs: 1000,
    });
    const request = { modelId: MODEL, organizationId: FREE_ORG };
    assert.equal(
      (await router.assertRouteHasCredits(request)).gateway,
      "openrouter"
    );
    assert.ok(
      logger.entries.some(
        (entry) => entry.event === "ai.router.credits_check_failed"
      )
    );
    now = 999;
    assert.equal(
      (await router.assertRouteHasCredits(request)).gateway,
      "openrouter"
    );
    assert.equal(attempts, 1);
    now = 1000;
    assert.equal(
      (await router.assertRouteHasCredits(request)).gateway,
      "openrouter"
    );
    assert.equal(attempts, 2);
  });

  test("passes when the selected gateway has credits and caches the lookup", async () => {
    let now = 0;
    const openrouter = createFakeAdapter({ id: "openrouter", balance: 10 });
    const { router } = createTestRouter({
      plans,
      openrouter,
      now: () => now,
      creditCheckTtlMs: CREDIT_TTL_MS,
    });
    const first = await router.assertRouteHasCredits({
      modelId: MODEL,
      organizationId: FREE_ORG,
    });
    assert.equal(first.gateway, "openrouter");
    await router.assertRouteHasCredits({
      modelId: MODEL,
      organizationId: FREE_ORG,
    });
    assert.equal(openrouter.balanceCalls, 1);
    now = CREDIT_TTL_MS + 1;
    await router.assertRouteHasCredits({
      modelId: MODEL,
      organizationId: FREE_ORG,
    });
    assert.equal(openrouter.balanceCalls, 2);
  });

  test("exhausted openrouter credits fall back to vercel", async () => {
    const openrouter = createFakeAdapter({ id: "openrouter", balance: 0 });
    const { router } = createTestRouter({ plans, openrouter });
    const decision = await router.assertRouteHasCredits({
      modelId: MODEL,
      organizationId: FREE_ORG,
    });
    assert.equal(decision.gateway, "vercel");
    assert.equal(decision.fallbackReason, "no-credits");
    // Models created afterwards use the funded gateway as well.
    const model = router.model(MODEL, { organizationId: FREE_ORG });
    const result = await model.doGenerate(callOptions());
    assert.equal(metadataOf(result)?.gateway, "vercel");
  });

  test("throws GatewayCreditBalanceError when no funded route exists", async () => {
    const openrouter = createFakeAdapter({ id: "openrouter", balance: 0 });
    const vercel = createFakeAdapter({ id: "vercel", balance: -1 });
    const { router } = createTestRouter({ plans, openrouter, vercel });
    await assert.rejects(
      router.assertRouteHasCredits({
        modelId: MODEL,
        organizationId: FREE_ORG,
      }),
      GatewayCreditBalanceError
    );

    const { router: noFallback } = createTestRouter({
      plans,
      openrouter: createFakeAdapter({ id: "openrouter", balance: 0 }),
      policy: { crossGatewayFallback: false },
    });
    await assert.rejects(
      noFallback.assertRouteHasCredits({
        modelId: MODEL,
        organizationId: FREE_ORG,
      }),
      GatewayCreditBalanceError
    );
  });
});

describe("classifyUpstreamFailure", () => {
  test("maps status codes to fallback reasons", () => {
    assert.equal(classifyUpstreamFailure(httpError(402)), "no-credits");
    assert.equal(classifyUpstreamFailure(httpError(404)), "unsupported-model");
    assert.equal(
      classifyUpstreamFailure(
        httpError(404, "No endpoints found matching your data policy")
      ),
      "non-compliant"
    );
    assert.equal(classifyUpstreamFailure(httpError(503)), "upstream-error");
    assert.equal(classifyUpstreamFailure(httpError(429)), "upstream-error");
    assert.equal(classifyUpstreamFailure(httpError(400)), undefined);
    assert.equal(
      classifyUpstreamFailure(new TypeError("fetch failed")),
      "upstream-error"
    );
    const abort = new Error("aborted");
    abort.name = "AbortError";
    assert.equal(classifyUpstreamFailure(abort), undefined);
  });
});

describe("non-enforced workspace privacy", () => {
  test("none relaxes both gateways with the production policy", async () => {
    const { router, vercel, openrouter } = createTestRouter({ plans });
    for (const gateway of ["vercel", "openrouter"] as const) {
      await router
        .model(MODEL, { organizationId: PAID_ORG, gateway, zdr: "none" })
        .doGenerate(callOptions());
    }
    assert.equal(
      vercel?.calls[0]?.options.providerOptions?.gateway?.zeroDataRetention,
      undefined
    );
    assert.equal(
      vercel?.calls[0]?.options.providerOptions?.gateway
        ?.disallowPromptTraining,
      false
    );
    assert.deepEqual(
      openrouter?.calls[0]?.options.providerOptions?.openrouter?.provider,
      {
        zdr: false,
        data_collection: "allow",
      }
    );
  });

  test("preferred recovers from the Muse Spark rejection but required stays strict", async () => {
    const vercel = createFakeAdapter({
      id: "vercel",
      onCall: (call) => {
        if (call.options.providerOptions?.gateway?.disallowPromptTraining) {
          throw httpError(
            500,
            "No providers that disallow prompt training available for model: meta/muse-spark-1.2. Providers considered: meta"
          );
        }
      },
    });
    const { router } = createTestRouter({ plans, vercel, openrouter: null });
    await router
      .model(MODEL, {
        organizationId: PAID_ORG,
        gateway: "vercel",
        zdr: "preferred",
      })
      .doGenerate(callOptions());
    assert.deepEqual(
      vercel.calls.map(
        (call) => call.options.providerOptions?.gateway?.disallowPromptTraining
      ),
      [true, false]
    );
    await assert.rejects(
      async () =>
        await router
          .model(MODEL, {
            organizationId: PAID_ORG,
            gateway: "vercel",
            zdr: "required",
          })
          .doGenerate(callOptions()),
      NoCompliantRouteError
    );
  });
});

test("relaxed OpenRouter calls override provider and model privacy defaults on the wire", async () => {
  const adapter = createOpenRouterAdapter({
    apiKey: "test-key",
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.provider, { zdr: false, data_collection: "allow" });
      return Response.json({
        id: "test",
        created: 0,
        model: MODEL,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "OK" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });
    },
  });
  await adapter.createModel(MODEL).doGenerate({
    ...callOptions(),
    providerOptions: adapter.buildProviderOptions({
      providerOptions: {},
      router: {},
      allowNonZdr: false,
      relaxZdr: true,
    }),
  });
});

test("relaxed routes preserve explicit no-training restrictions", async () => {
  const { router, vercel, openrouter } = createTestRouter({ plans });
  await router
    .model(MODEL, { gateway: "vercel", zdr: "none" })
    .doGenerate(callOptions({ gateway: { disallowPromptTraining: true } }));
  await router
    .model(MODEL, { gateway: "openrouter", zdr: "none" })
    .doGenerate(
      callOptions({ openrouter: { provider: { data_collection: "deny" } } })
    );
  assert.equal(
    vercel?.calls[0]?.options.providerOptions?.gateway?.disallowPromptTraining,
    true
  );
  assert.deepEqual(
    openrouter?.calls[0]?.options.providerOptions?.openrouter?.provider,
    { zdr: false, data_collection: "deny" }
  );
});
