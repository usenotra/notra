import { expect, test } from "bun:test";

import { Deferred, Effect, Fiber } from "effect";

import { readBodyUpTo, readBodyUpToEffect } from "../src/utils/read-body";

test("capped reader handles empty bodies and zero-byte limits", async () => {
  expect(await readBodyUpTo(new Response(null), 0)).toEqual({
    bytes: new Uint8Array(),
    exceeded: false,
  });
  expect(await readBodyUpTo(new Response("x"), 0)).toEqual({
    bytes: new Uint8Array(),
    exceeded: true,
  });
});

test("capped reader preserves read error identity and releases its lock", async () => {
  const error = new Error("read failed");
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.error(error);
    },
  });
  await expect(readBodyUpTo(new Response(stream), 10)).rejects.toBe(error);
  expect(stream.locked).toBe(false);
});

test("interruption cancels a pending read without waiting for cancellation acknowledgement", async () => {
  let cancelled = false;
  await Effect.runPromise(
    Effect.gen(function* () {
      const reading = yield* Deferred.make<void>();
      const stream = new ReadableStream<Uint8Array>(
        {
          pull() {
            Effect.runSync(Deferred.succeed(reading, undefined));
          },
          cancel() {
            cancelled = true;
            return new Promise<void>(() => {});
          },
        },
        { highWaterMark: 0 }
      );
      const fiber = yield* readBodyUpToEffect(new Response(stream), 10).pipe(
        Effect.forkChild
      );
      yield* Deferred.await(reading);
      yield* Fiber.interrupt(fiber);
      expect(cancelled).toBe(true);
      expect(stream.locked).toBe(false);
    })
  );
});

test("overrun cancellation failure is best effort and does not replace the result", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
    },
    cancel() {
      return Promise.reject(new Error("cancel failed"));
    },
  });
  expect(await readBodyUpTo(new Response(stream), 1)).toEqual({
    bytes: new Uint8Array([1]),
    exceeded: true,
  });
  expect(stream.locked).toBe(false);
});
