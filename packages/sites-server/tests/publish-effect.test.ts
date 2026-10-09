import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import { Deferred, Effect, Fiber } from "effect";

import { publishFixture } from "./constants/publish-effect";
import { createSiteArchive } from "./utils/site-archive";

if (!process.env.NOTRA_SITES_PUBLISH_EFFECT_TEST_WORKER) {
  test("publisher composes uploads within one Effect lifetime", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SITES_PUBLISH_EFFECT_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  let upload: (
    key: string,
    body: Uint8Array | string
  ) => Effect.Effect<string, unknown>;
  mock.module("../src/r2", () => ({
    r2PutEffect: (key: string, body: Uint8Array | string) => upload(key, body),
  }));
  const { publishDeploymentFilesEffect } = await import("../src/publish");
  const archive = createSiteArchive(["z.html", "a.html"]);
  const params = { ...publishFixture, archive };
  const manifestKey = SITE_R2_KEYS.manifest(
    params.site.id,
    params.deployment.id
  );

  test("publisher writes its sorted immutable manifest only after every upload", async () => {
    const keys: string[] = [];
    let storedManifest = "";
    upload = (key, body) =>
      Effect.sync(() => {
        keys.push(key);
        if (key === manifestKey) {
          storedManifest = String(body);
        }
        return "etag";
      });
    const manifest = await Effect.runPromise(
      publishDeploymentFilesEffect(params)
    );
    expect(keys.at(-1)).toBe(manifestKey);
    expect(manifest.files.map((file) => file.path)).toEqual([
      "/a.html",
      "/z.html",
    ]);
    expect(manifest.target).toEqual(params.deployment.target);
    expect(manifest.configHash).toBe(params.deployment.configHash);
    expect(JSON.parse(storedManifest)).toEqual(manifest);
  });

  test("publisher failure interrupts sibling uploads before returning and never writes a manifest", async () => {
    const failure = new Error("upload failed");
    await Effect.runPromise(
      Effect.gen(function* () {
        const started = yield* Deferred.make<void>();
        let released = false;
        let manifestWrites = 0;
        upload = (key) => {
          if (key === manifestKey) {
            manifestWrites++;
            return Effect.succeed("etag");
          }
          if (key.endsWith("/a.html")) {
            return Deferred.await(started).pipe(
              Effect.andThen(Effect.fail(failure))
            );
          }
          return Effect.acquireUseRelease(
            Deferred.succeed(started, undefined),
            () => Effect.never,
            () =>
              Effect.sync(() => {
                released = true;
              })
          );
        };
        const result = yield* Effect.result(
          publishDeploymentFilesEffect(params)
        );
        expect(result).toMatchObject({ _tag: "Failure", failure });
        expect(released).toBe(true);
        expect(manifestWrites).toBe(0);
      })
    );
  });

  test("parent interruption releases uploads before publishing can complete", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const started = yield* Deferred.make<void>();
        let released = 0;
        upload = () =>
          Effect.acquireUseRelease(
            Deferred.succeed(started, undefined),
            () => Effect.never,
            () =>
              Effect.sync(() => {
                released++;
              })
          );
        const fiber = yield* publishDeploymentFilesEffect(params).pipe(
          Effect.forkChild
        );
        yield* Deferred.await(started);
        yield* Fiber.interrupt(fiber);
        expect(released).toBeGreaterThan(0);
      })
    );
  });
}
