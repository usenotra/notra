import { afterAll, afterEach, expect, spyOn, test } from "bun:test";

import { Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";

import {
  GITHUB_ARCHIVE_TIMEOUT_MS,
  MAX_TARBALL_BYTES,
} from "../src/constants/github";
import { SitePermanentBuildError } from "../src/errors";
import {
  downloadRepositoryTarball,
  downloadRepositoryTarballEffect,
} from "../src/github";
import { githubRepository } from "./constants/provider-effect";

const transport = spyOn(globalThis, "fetch");
afterEach(() => transport.mockReset());
afterAll(() => transport.mockRestore());

test("GitHub archive decoding retains bounded bytes and authenticated redirect behavior", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  transport.mockImplementation(async (input, init) => {
    expect(String(input)).toEndWith(
      "/synthetic-owner/synthetic-repository/tarball/commit%2Fref"
    );
    expect(init?.redirect).toBe("follow");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer synthetic-token"
    );
    return new Response(bytes);
  });
  expect(
    await downloadRepositoryTarball(
      githubRepository,
      "synthetic-token",
      "commit/ref"
    )
  ).toEqual(bytes);
});

test("GitHub rejects an oversized declaration and disposes its unread response", async () => {
  let cancelled = false;
  let reads = 0;
  const stream = new ReadableStream(
    {
      pull() {
        reads++;
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 }
  );
  transport.mockResolvedValue(
    new Response(stream, {
      headers: { "content-length": String(MAX_TARBALL_BYTES + 1) },
    })
  );
  await expect(
    downloadRepositoryTarball(githubRepository, "synthetic-token", "commit")
  ).rejects.toBeInstanceOf(SitePermanentBuildError);
  expect(cancelled).toBe(true);
  expect(reads).toBe(0);
});

test("GitHub body deadlines cancel and release readers without waiting for acknowledgement", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const reading = yield* Deferred.make<void>();
      let signal: AbortSignal | null | undefined;
      let cancelled = false;
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
      transport.mockImplementation(async (_input, init) => {
        signal = init?.signal;
        return new Response(stream);
      });
      const fiber = yield* downloadRepositoryTarballEffect(
        githubRepository,
        "synthetic-token",
        "commit"
      ).pipe(Effect.forkChild);
      yield* Deferred.await(reading);
      yield* TestClock.adjust(GITHUB_ARCHIVE_TIMEOUT_MS);
      expect(yield* Fiber.await(fiber)).toMatchObject({ _tag: "Failure" });
      expect(signal?.aborted).toBe(true);
      expect(cancelled).toBe(true);
      expect(stream.locked).toBe(false);
    }).pipe(Effect.provide(TestClock.layer()))
  );
});
