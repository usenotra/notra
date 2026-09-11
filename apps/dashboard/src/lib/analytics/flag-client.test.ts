import { describe, expect, test } from "bun:test";

import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";

import { ANALYTICS_FLAG_ERROR_REASON } from "@/constants/analytics";
import { AnalyticsFlagEvaluationError } from "@/lib/analytics/errors";
import { boundAnalyticsFlagEvaluation } from "@/lib/analytics/flag-client";

/** Comfortably past the bound the module applies. */
const PAST_THE_TIMEOUT = "1 minute";

describe("bounded analytics flag evaluation", () => {
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
