import { describe, expect, test } from "bun:test";

import { Cache, Deferred, Effect, Fiber } from "effect";
import * as TestClock from "effect/testing/TestClock";

import { GeoBillingError } from "../src/errors/billing";
import { makeGeoEntitlementCache } from "../src/lib/geo-entitlement-cache";

describe("GEO entitlement cache", () => {
  test("deduplicates concurrent checks, expires grants, and isolates organizations", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        let calls = 0;
        const entered = yield* Deferred.make<void>();
        const release = yield* Deferred.make<void>();
        const cache = yield* makeGeoEntitlementCache(() =>
          Effect.gen(function* () {
            calls++;
            yield* Deferred.succeed(entered, undefined);
            yield* Deferred.await(release);
            return true;
          })
        );
        const burst = yield* Effect.forEach(
          Array.from({ length: 32 }),
          () => Cache.get(cache, "org-a"),
          { concurrency: "unbounded" }
        ).pipe(Effect.forkChild);
        yield* Deferred.await(entered);
        yield* Deferred.succeed(release, undefined);
        expect(yield* Fiber.join(burst)).toEqual(new Array(32).fill(true));
        expect(calls).toBe(1);
        yield* Cache.get(cache, "org-a");
        expect(calls).toBe(1);
        yield* Cache.get(cache, "org-b");
        expect(calls).toBe(2);
        yield* TestClock.adjust("29 seconds");
        yield* Cache.get(cache, "org-a");
        expect(calls).toBe(2);
        yield* TestClock.adjust("1 second");
        yield* Cache.get(cache, "org-a");
        expect(calls).toBe(3);
      }).pipe(Effect.provide(TestClock.layer()))
    ));

  test("does not retain denials or failures; an expired grant fails closed", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        let calls = 0;
        let allowed = false;
        let unavailable = false;
        const cache = yield* makeGeoEntitlementCache(() =>
          Effect.suspend(() => {
            calls++;
            return unavailable
              ? Effect.fail(
                  new GeoBillingError({ cause: new Error("offline") })
                )
              : Effect.succeed(allowed);
          })
        );
        expect(yield* Cache.get(cache, "org")).toBe(false);
        allowed = true;
        expect(yield* Cache.get(cache, "org")).toBe(true);
        expect(calls).toBe(2);
        unavailable = true;
        yield* TestClock.adjust("30 seconds");
        expect((yield* Effect.result(Cache.get(cache, "org")))._tag).toBe(
          "Failure"
        );
        expect((yield* Effect.result(Cache.get(cache, "org")))._tag).toBe(
          "Failure"
        );
        expect(calls).toBe(4);
        unavailable = false;
        allowed = false;
        expect(yield* Cache.get(cache, "org")).toBe(false);
        expect(calls).toBe(5);
      }).pipe(Effect.provide(TestClock.layer()))
    ));
});
