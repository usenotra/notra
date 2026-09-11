import { afterEach, describe, expect, test } from "bun:test";

import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";

import {
  ANALYTICS_FLAG_ERROR_REASON,
  SOCIAL_ANALYTICS_FLAG_KEY,
} from "@/constants/analytics";
import { evaluateAnalyticsFlag } from "@/lib/analytics/flag-client";

/** Comfortably past the bound the module applies. */
const PAST_THE_TIMEOUT = "1 minute";

const TEST_CLIENT_ID = "test-client-id";
const TEST_ORGANIZATION_ID = "org-test";

function mockFlagsFetch(payload: unknown) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

describe("evaluateAnalyticsFlag", () => {
  afterEach(() => {
    globalThis.fetch = fetch;
  });

  test("an evaluation that never answers becomes unavailable", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((_, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      })) as typeof fetch;

    try {
      const state = await Effect.runPromise(
        Effect.gen(function* () {
          const fiber = yield* Effect.forkChild(
            evaluateAnalyticsFlag(TEST_CLIENT_ID, TEST_ORGANIZATION_ID)
          );
          yield* TestClock.adjust(PAST_THE_TIMEOUT);
          return yield* Fiber.join(fiber);
        }).pipe(Effect.provide(TestClock.layer()))
      );

      expect(state).toBe("unavailable");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("a rejected evaluation becomes unavailable, like the timeout", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.reject(new Error("socket hang up"))) as typeof fetch;

    try {
      const state = await Effect.runPromise(
        evaluateAnalyticsFlag(TEST_CLIENT_ID, TEST_ORGANIZATION_ID)
      );
      expect(state).toBe("unavailable");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("the provider's own error reason becomes unavailable", async () => {
    const restoreFetch = mockFlagsFetch({
      flags: {
        [SOCIAL_ANALYTICS_FLAG_KEY]: {
          enabled: true,
          reason: ANALYTICS_FLAG_ERROR_REASON,
        },
      },
    });

    try {
      const state = await Effect.runPromise(
        evaluateAnalyticsFlag(TEST_CLIENT_ID, TEST_ORGANIZATION_ID)
      );
      expect(state).toBe("unavailable");
    } finally {
      restoreFetch();
    }
  });

  test("a resolved evaluation keeps its answer", async () => {
    const restoreEnabledFetch = mockFlagsFetch({
      flags: {
        [SOCIAL_ANALYTICS_FLAG_KEY]: {
          enabled: true,
          reason: "match",
        },
      },
    });
    const enabled = await Effect.runPromise(
      evaluateAnalyticsFlag(TEST_CLIENT_ID, TEST_ORGANIZATION_ID)
    );
    restoreEnabledFetch();

    const restoreDisabledFetch = mockFlagsFetch({
      flags: {
        [SOCIAL_ANALYTICS_FLAG_KEY]: {
          enabled: false,
          reason: "match",
        },
      },
    });
    const disabled = await Effect.runPromise(
      evaluateAnalyticsFlag(TEST_CLIENT_ID, TEST_ORGANIZATION_ID)
    );
    restoreDisabledFetch();

    expect([enabled, disabled]).toEqual(["enabled", "disabled"]);
  });
});
