import { expect, test } from "bun:test";

import { Deferred, Effect, Fiber } from "effect";

import {
  mapWithConcurrency,
  mapWithConcurrencyEffect,
} from "../src/utils/concurrency";

test("bounded mapping preserves input order across out-of-order completion", async () => {
  const gates = await Effect.runPromise(
    Effect.forEach([0, 1, 2, 3], () => Deferred.make<void>())
  );
  const started = await Effect.runPromise(Deferred.make<void>());
  const secondPair = await Effect.runPromise(Deferred.make<void>());
  const calls: number[] = [];
  let active = 0;
  let maximum = 0;
  const result = mapWithConcurrency([0, 1, 2, 3], 2, async (item) => {
    calls.push(item);
    active += 1;
    maximum = Math.max(maximum, active);
    if (calls.length === 2) {
      await Effect.runPromise(Deferred.succeed(started, undefined));
    }
    if (calls.length === 4) {
      await Effect.runPromise(Deferred.succeed(secondPair, undefined));
    }
    const gate = gates[item];
    if (!gate) {
      throw new Error("Missing completion gate");
    }
    await Effect.runPromise(Deferred.await(gate));
    active -= 1;
    return `result-${item}`;
  });
  await Effect.runPromise(Deferred.await(started));
  expect(calls).toEqual([0, 1]);
  for (const index of [1, 0]) {
    const gate = gates[index];
    if (!gate) {
      throw new Error("Missing completion gate");
    }
    await Effect.runPromise(Deferred.succeed(gate, undefined));
  }
  await Effect.runPromise(Deferred.await(secondPair));
  for (const index of [3, 2]) {
    const gate = gates[index];
    if (!gate) {
      throw new Error("Missing completion gate");
    }
    await Effect.runPromise(Deferred.succeed(gate, undefined));
  }
  expect(await result).toEqual([
    "result-0",
    "result-1",
    "result-2",
    "result-3",
  ]);
  expect(maximum).toBe(2);
});

test("mapping exposes the original rejection and stops scheduling new work", async () => {
  const error = new Error("provider failed");
  const calls: number[] = [];
  const result = mapWithConcurrency([0, 1, 2], 1, async (item) => {
    calls.push(item);
    throw error;
  });
  await expect(result).rejects.toBe(error);
  expect(calls).toEqual([0]);
});

test("empty mapping invokes no callback even with an invalid limit", async () => {
  expect(
    await mapWithConcurrency([], 0, async () => {
      throw new Error("Unexpected callback");
    })
  ).toEqual([]);
});

test("fractional positive limits are floored and Infinity covers all items", async () => {
  for (const limit of [1.5, Infinity, 20]) {
    expect(
      await mapWithConcurrency([1, 2], limit, async (item) => item * 2)
    ).toEqual([2, 4]);
  }
  for (const limit of [0, -1, Number.NaN, 0.5]) {
    await expect(
      mapWithConcurrency([1], limit, async (item) => item)
    ).rejects.toBeInstanceOf(RangeError);
  }
});

test("native mapping interrupts and awaits siblings before exposing failure", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const siblingStarted = yield* Deferred.make<void>();
      const error = new Error("Native item failure");
      let siblingFinalized = false;
      const calls: number[] = [];
      const result = yield* mapWithConcurrencyEffect([0, 1, 2], 2, (item) =>
        Effect.gen(function* () {
          calls.push(item);
          if (item === 0) {
            yield* Deferred.await(siblingStarted);
            return yield* Effect.fail(error);
          }
          yield* Deferred.succeed(siblingStarted, undefined);
          return yield* Effect.never.pipe(
            Effect.ensuring(
              Effect.sync(() => {
                siblingFinalized = true;
              })
            )
          );
        })
      ).pipe(Effect.result);
      expect(result._tag).toBe("Failure");
      if (result._tag !== "Failure") {
        throw new Error("Expected item failure");
      }
      expect(result.failure).toBe(error);
      expect(calls).toEqual([0, 1]);
      expect(siblingFinalized).toBe(true);
    })
  );
});

test("interrupting native mapping awaits every active item's finalizer", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      let active = 0;
      let finalized = 0;
      const calls: number[] = [];
      const fiber = yield* mapWithConcurrencyEffect([0, 1, 2], 2, (item) =>
        Effect.gen(function* () {
          calls.push(item);
          active += 1;
          if (active === 2) {
            yield* Deferred.succeed(started, undefined);
          }
          return yield* Effect.never;
        }).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              finalized += 1;
            })
          )
        )
      ).pipe(Effect.forkChild);
      yield* Deferred.await(started);
      yield* Fiber.interrupt(fiber);
      expect(calls).toEqual([0, 1]);
      expect(finalized).toBe(2);
    })
  );
});
