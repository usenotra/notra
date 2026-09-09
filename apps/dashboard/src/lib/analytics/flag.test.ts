import { describe, expect, test } from "bun:test";

import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";

import { ANALYTICS_FLAG_ERROR_REASON } from "@/constants/analytics";
import { AnalyticsFlagEvaluationError } from "@/lib/analytics/errors";
import {
  boundAnalyticsFlagEvaluation,
  deduplicatePendingAnalyticsFlagEvaluation,
} from "@/lib/analytics/flag";

/** Comfortably past the bound the module applies. */
const PAST_THE_TIMEOUT = "1 minute";

describe("bounded analytics flag evaluation", () => {
  test("does not start more provider work when the pending limit is reached", async () => {
    let resolvePending: ((value: { enabled: boolean }) => void) | undefined;
    const pending = new Promise<{ enabled: boolean }>((resolve) => {
      resolvePending = resolve;
    });
    let calls = 0;
    const evaluate = () => {
      calls += 1;
      return pending;
    };
    try {
      for (let index = 0; index < 500; index += 1) {
        deduplicatePendingAnalyticsFlagEvaluation(
          `capacity-${index}`,
          evaluate
        );
      }
      expect(
        await deduplicatePendingAnalyticsFlagEvaluation(
          "capacity-overflow",
          evaluate
        )
      ).toEqual({ enabled: false, reason: ANALYTICS_FLAG_ERROR_REASON });
      expect(calls).toBe(500);
      expect(
        deduplicatePendingAnalyticsFlagEvaluation("capacity-0", evaluate)
      ).toBe(pending);
    } finally {
      resolvePending?.({ enabled: true });
      await pending;
    }
  });

  test("shares an underlying pending evaluation until it settles", async () => {
    let resolveEvaluation: ((value: { enabled: boolean }) => void) | undefined;
    let calls = 0;
    const evaluate = () => {
      calls += 1;
      return new Promise<{ enabled: boolean }>((resolve) => {
        resolveEvaluation = resolve;
      });
    };
    const organizationId = "org-pending-dedup";

    const first = deduplicatePendingAnalyticsFlagEvaluation(
      organizationId,
      evaluate
    );
    const second = deduplicatePendingAnalyticsFlagEvaluation(
      organizationId,
      evaluate
    );

    expect(second).toBe(first);
    expect(calls).toBe(1);
    resolveEvaluation?.({ enabled: true });
    await expect(first).resolves.toEqual({ enabled: true });

    const afterSettlement = deduplicatePendingAnalyticsFlagEvaluation(
      organizationId,
      () => Promise.resolve({ enabled: false })
    );
    expect(afterSettlement).not.toBe(first);
  });

  test("an evaluation that never answers becomes unavailable", async () => {
    const state = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(
          boundAnalyticsFlagEvaluation(Effect.never)
        );
        yield* TestClock.adjust(PAST_THE_TIMEOUT);
        return yield* Fiber.join(fiber);
      }).pipe(Effect.provide(TestClock.layer()))
    );

    expect(state).toBe("unavailable");
  });

  test("a rejected evaluation becomes unavailable, like the timeout", async () => {
    const state = await Effect.runPromise(
      boundAnalyticsFlagEvaluation(
        Effect.fail(
          new AnalyticsFlagEvaluationError({
            message: "Failed to evaluate the analytics feature flag",
            cause: new Error("socket hang up"),
          })
        )
      )
    );

    expect(state).toBe("unavailable");
  });

  test("the provider's own error reason becomes unavailable", async () => {
    const state = await Effect.runPromise(
      boundAnalyticsFlagEvaluation(
        Effect.succeed({ enabled: true, reason: ANALYTICS_FLAG_ERROR_REASON })
      )
    );

    expect(state).toBe("unavailable");
  });

  test("a resolved evaluation keeps its answer", async () => {
    const enabled = await Effect.runPromise(
      boundAnalyticsFlagEvaluation(
        Effect.succeed({ enabled: true, reason: "match" })
      )
    );
    const disabled = await Effect.runPromise(
      boundAnalyticsFlagEvaluation(
        Effect.succeed({ enabled: false, reason: "match" })
      )
    );

    expect([enabled, disabled]).toEqual(["enabled", "disabled"]);
  });
});
