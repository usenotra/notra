import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import type { SiteServingState } from "@notra/sites-core/types/deployment";
import { createInitialServingState } from "@notra/sites-core/utils/serving-state";
import { Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";

import { CAS_ATTEMPTS, CAS_BACKOFF_MS } from "../src/constants/state";
import { R2PreconditionFailedError } from "../src/errors";
import type { R2PutOptions } from "../src/types/r2";
import type { ServingPreviewAccess } from "../src/types/state";

if (process.env.NOTRA_SITES_STATE_EFFECT_TEST_WORKER !== "1") {
  test("serving-state effects with isolated database and R2 adapters", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SITES_STATE_EFFECT_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const site = { id: "site1", slug: "site1" };
  const key = SITE_R2_KEYS.state(site.id);
  const objects = new Map<string, { text: string; etag: string }>();
  let access: ServingPreviewAccess;
  let reads = 0;
  let accessReads = 0;
  let writes: R2PutOptions[] = [];
  let onRead = async () => {};
  let onAccess = async () => {};
  let onPut = async () => {};
  let onReadEffect: Effect.Effect<void> = Effect.void;
  let onPutEffect: Effect.Effect<void> = Effect.void;

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            accessReads += 1;
            await onAccess();
            return [access];
          },
        }),
      }),
    }),
  };
  mock.module("@notra/db/drizzle", () => ({ db }));
  mock.module("@notra/geo-core/geo/ingest", () => ({
    buildGeoIngestSiteToken: () => "traffic-token",
  }));
  const r2 = {
    r2GetText: async (objectKey: string) => {
      reads += 1;
      await onRead();
      return objects.get(objectKey) ?? null;
    },
    r2Put: async (objectKey: string, text: string, options: R2PutOptions) => {
      writes.push(options);
      await onPut();
      const existing = objects.get(objectKey);
      if (
        (options.ifMatch !== undefined && options.ifMatch !== existing?.etag) ||
        (options.ifNoneMatch === "*" && existing !== undefined)
      ) {
        throw new R2PreconditionFailedError("Conditional write conflict");
      }
      objects.set(objectKey, { text, etag: `etag-${writes.length}` });
      return `etag-${writes.length}`;
    },
    r2DeleteKey: async () => {},
  };
  mock.module("../src/r2", () => ({
    ...r2,
    r2GetTextEffect: (...args: Parameters<typeof r2.r2GetText>) =>
      onReadEffect.pipe(
        Effect.andThen(
          Effect.tryPromise({
            try: () => r2.r2GetText(...args),
            catch: (error) => error,
          })
        )
      ),
    r2PutEffect: (...args: Parameters<typeof r2.r2Put>) =>
      onPutEffect.pipe(
        Effect.andThen(
          Effect.tryPromise({
            try: () => r2.r2Put(...args),
            catch: (error) => error,
          })
        )
      ),
  }));

  const { mutateServingState, mutateServingStateEffect } =
    await import("../src/state");
  const initial = () =>
    createInitialServingState({ ...site, siteId: site.id, now: new Date(0) });
  const stored = (): SiteServingState => {
    const object = objects.get(key);
    if (!object) {
      throw new Error("Missing serving state");
    }
    return JSON.parse(object.text);
  };

  beforeEach(() => {
    objects.clear();
    access = { previewPassword: null, previewVisibility: "protected" };
    reads = 0;
    accessReads = 0;
    writes = [];
    onRead = async () => {};
    onAccess = async () => {};
    onPut = async () => {};
    onReadEffect = Effect.void;
    onPutEffect = Effect.void;
  });

  test("six attempts use exponential delays and stop without a final sleep", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const attempts = yield* Effect.forEach(
          Array.from({ length: CAS_ATTEMPTS }),
          () => Deferred.make<void>()
        );
        onPut = async () => {
          const signal = attempts[writes.length - 1];
          if (!signal) {
            throw new Error("Unexpected extra attempt");
          }
          await Effect.runPromise(Deferred.succeed(signal, undefined));
          throw new R2PreconditionFailedError("Conflict");
        };
        const fiber = yield* mutateServingStateEffect(site, (state) => ({
          write: state,
          result: "unused",
        })).pipe(Effect.result, Effect.forkChild);
        for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
          const signal = attempts[attempt];
          if (!signal) {
            throw new Error("Missing attempt signal");
          }
          yield* Deferred.await(signal);
          expect(writes).toHaveLength(attempt + 1);
          if (attempt < CAS_ATTEMPTS - 1) {
            const delay = CAS_BACKOFF_MS * 2 ** attempt;
            yield* TestClock.adjust(delay - 1);
            expect(writes).toHaveLength(attempt + 1);
            yield* TestClock.adjust(1);
          }
        }
        const result = yield* Fiber.join(fiber);
        expect(result._tag).toBe("Failure");
        if (result._tag !== "Failure") {
          throw new Error("Expected contention failure");
        }
        expect(result.failure).toBeInstanceOf(Error);
        expect(String(result.failure)).toBe(
          "Error: Could not update serving state for site1: too much contention"
        );
        expect(reads).toBe(CAS_ATTEMPTS);
        expect(accessReads).toBe(CAS_ATTEMPTS);
        expect(writes.every((options) => options.ifNoneMatch === "*")).toBe(
          true
        );
      }).pipe(Effect.provide(TestClock.layer()))
    );
  });

  test("conflicts reread state, ETag and access before rerunning the callback", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const failed = yield* Deferred.make<void>();
        let callbacks = 0;
        onPut = async () => {
          if (writes.length === 1) {
            objects.set(key, {
              text: JSON.stringify({ ...initial(), slug: "contender" }),
              etag: "contender-etag",
            });
            access = { previewPassword: null, previewVisibility: "public" };
            await Effect.runPromise(Deferred.succeed(failed, undefined));
          }
        };
        const fiber = yield* mutateServingStateEffect(
          site,
          (state, currentAccess) => {
            callbacks += 1;
            if (callbacks === 2) {
              expect(state.slug).toBe("contender");
              expect(currentAccess.previewVisibility).toBe("public");
            }
            return {
              write: { ...state, status: "suspended" },
              result: callbacks,
            };
          }
        ).pipe(Effect.forkChild);
        yield* Deferred.await(failed);
        yield* TestClock.adjust(CAS_BACKOFF_MS);
        expect(yield* Fiber.join(fiber)).toBe(2);
        expect(reads).toBe(2);
        expect(accessReads).toBe(2);
        expect(
          writes.map((options) => [options.ifNoneMatch, options.ifMatch])
        ).toEqual([
          ["*", undefined],
          [undefined, "contender-etag"],
        ]);
        expect(stored().trafficToken).toBe("traffic-token");
        expect(stored().status).toBe("suspended");
      }).pipe(Effect.provide(TestClock.layer()))
    );
  });

  test("skip results avoid writes unless existing derived state needs synchronization", async () => {
    const result = { outcome: "skip" };
    expect(await mutateServingState(site, () => ({ skip: true, result }))).toBe(
      result
    );
    expect(writes).toHaveLength(0);
    objects.set(key, { text: JSON.stringify(initial()), etag: "stale" });
    expect(await mutateServingState(site, () => ({ skip: true, result }))).toBe(
      result
    );
    expect(writes).toHaveLength(1);
    expect(writes[0]?.ifMatch).toBe("stale");
    expect(stored().trafficToken).toBe("traffic-token");
    expect(await mutateServingState(site, () => ({ skip: true, result }))).toBe(
      result
    );
    expect(writes).toHaveLength(1);
  });

  test("non-PUT errors never retry, even when they are precondition errors", async () => {
    for (const source of ["read", "access", "callback", "put"]) {
      const error =
        source === "put"
          ? new Error("Provider failure")
          : new R2PreconditionFailedError("Not a PUT conflict");
      reads = 0;
      accessReads = 0;
      writes = [];
      onRead = async () => {
        if (source === "read") {
          throw error;
        }
      };
      onAccess = async () => {
        if (source === "access") {
          throw error;
        }
      };
      onPut = async () => {
        if (source === "put") {
          throw error;
        }
      };
      await expect(
        mutateServingState(site, (state) => {
          if (source === "callback") {
            throw error;
          }
          return { write: state, result: undefined };
        })
      ).rejects.toBe(error);
      expect(reads).toBe(1);
      expect(accessReads).toBe(source === "read" ? 0 : 1);
      expect(writes).toHaveLength(source === "put" ? 1 : 0);
    }
  });

  test("malformed persisted state is visible and never retried", async () => {
    objects.set(key, { text: "{invalid", etag: "bad" });
    await expect(
      mutateServingState(site, (state) => ({ write: state, result: undefined }))
    ).rejects.toBeInstanceOf(SyntaxError);
    expect(reads).toBe(1);
    expect(accessReads).toBe(0);
    expect(writes).toHaveLength(0);
  });

  test("serialization failures preserve identity without a PUT or retry", async () => {
    const error = new Error("Cannot serialize state");
    await expect(
      mutateServingState(site, (state) => {
        Object.defineProperty(state.previews, "toJSON", {
          value: () => {
            throw error;
          },
        });
        return { write: state, result: undefined };
      })
    ).rejects.toBe(error);
    expect(reads).toBe(1);
    expect(accessReads).toBe(1);
    expect(writes).toHaveLength(0);
  });

  test.each(["read", "put"])(
    "caller interruption reaches native R2 %s and awaits cleanup",
    async (source) => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const started = yield* Deferred.make<void>();
          let finalized = false;
          const stalled = Effect.gen(function* () {
            yield* Deferred.succeed(started, undefined);
            return yield* Effect.never;
          }).pipe(
            Effect.ensuring(
              Effect.sync(() => {
                finalized = true;
              })
            )
          );
          onReadEffect = source === "read" ? stalled : Effect.void;
          onPutEffect = source === "put" ? stalled : Effect.void;
          const fiber = yield* mutateServingStateEffect(site, (state) => ({
            write: state,
            result: undefined,
          })).pipe(Effect.forkChild);
          yield* Deferred.await(started);
          yield* Fiber.interrupt(fiber);
          expect(finalized).toBe(true);
          expect(writes).toHaveLength(0);
          expect(objects.size).toBe(0);
        })
      );
    }
  );
}
