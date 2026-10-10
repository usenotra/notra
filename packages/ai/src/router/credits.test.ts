import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  CREDIT_TTL_MS,
  FREE_ORG,
  MODEL,
  plans,
} from "@notra/ai/constants/router-test";

import { GatewayCreditBalanceError } from "./errors";
import { classifyUpstreamFailure } from "./lazy-model";
import {
  callOptions,
  createFakeAdapter,
  createTestRouter,
  httpError,
  metadataOf,
} from "./test-helpers";

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
    assert.equal(
      classifyUpstreamFailure(httpError(401, "API key expired")),
      "auth-failure"
    );
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
