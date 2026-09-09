import { describe, expect, test } from "bun:test";

import { Effect, Layer } from "effect";

import { GeoFeatureFlagService } from "../src/deps";
import { loadGeoEngineFlags } from "../src/geo/engine-flags";

interface CountingFlagProvider {
  readonly layer: Layer.Layer<GeoFeatureFlagService>;
  calls(): number;
}

function countingFlagProvider(options?: {
  readonly failOnce?: boolean;
}): CountingFlagProvider {
  let calls = 0;
  let failuresLeft = options?.failOnce ? 1 : 0;
  const evaluate = () =>
    Effect.suspend(() => {
      calls += 1;
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        return Effect.die(new Error("flag provider unavailable"));
      }
      return Effect.succeed(true);
    });

  return {
    calls: () => calls,
    layer: Layer.succeed(
      GeoFeatureFlagService,
      GeoFeatureFlagService.of({
        isCursorEngineEnabledForOrganization: evaluate,
        isOpenCodeEngineEnabledForOrganization: evaluate,
      })
    ),
  };
}

/** Each test uses its own key: the cache is a module-level singleton. */
let nextOrganizationId = 0;
function organizationId(): string {
  nextOrganizationId += 1;
  return `org-engine-flags-${nextOrganizationId}`;
}

describe("engine flag cache", () => {
  test("a warm lookup does not reach the flag provider", async () => {
    const provider = countingFlagProvider();
    const scope = organizationId();

    const cold = await Effect.runPromise(
      loadGeoEngineFlags(scope).pipe(Effect.provide(provider.layer))
    );
    expect(cold).toEqual({ cursorEnabled: true, openCodeEnabled: true });
    // Two questions per organization, asked concurrently.
    expect(provider.calls()).toBe(2);

    for (let index = 0; index < 9; index += 1) {
      const warm = await Effect.runPromise(
        loadGeoEngineFlags(scope).pipe(Effect.provide(provider.layer))
      );
      expect(warm).toEqual(cold);
    }
    expect(provider.calls()).toBe(2);
  });

  test("concurrent cold lookups share one evaluation", async () => {
    const provider = countingFlagProvider();
    const scope = organizationId();

    const results = await Effect.runPromise(
      Effect.all(
        Array.from({ length: 8 }, () => loadGeoEngineFlags(scope)),
        { concurrency: "unbounded" }
      ).pipe(Effect.provide(provider.layer))
    );

    expect(results).toHaveLength(8);
    expect(provider.calls()).toBe(2);
  });

  test("distinct organizations are cached separately", async () => {
    const provider = countingFlagProvider();
    const first = organizationId();
    const second = organizationId();

    await Effect.runPromise(
      loadGeoEngineFlags(first).pipe(Effect.provide(provider.layer))
    );
    await Effect.runPromise(
      loadGeoEngineFlags(second).pipe(Effect.provide(provider.layer))
    );
    await Effect.runPromise(
      loadGeoEngineFlags(first).pipe(Effect.provide(provider.layer))
    );

    expect(provider.calls()).toBe(4);
  });

  test("a failed evaluation is not cached", async () => {
    const provider = countingFlagProvider({ failOnce: true });
    const scope = organizationId();

    const failed = await Effect.runPromise(
      Effect.exit(
        loadGeoEngineFlags(scope).pipe(Effect.provide(provider.layer))
      )
    );
    expect(failed._tag).toBe("Failure");

    const recovered = await Effect.runPromise(
      loadGeoEngineFlags(scope).pipe(Effect.provide(provider.layer))
    );
    expect(recovered).toEqual({ cursorEnabled: true, openCodeEnabled: true });
  });
});
