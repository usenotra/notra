import type { SiteBuildMetrics } from "@notra/sites-core/types/build-metrics";
import { Effect } from "effect";

export const measureSandboxPhase = Effect.fn("Sites.Sandbox.measurePhase")(
  function* <A, E, R>(
    metrics: SiteBuildMetrics,
    phase: keyof SiteBuildMetrics["phases"],
    program: Effect.Effect<A, E, R>
  ) {
    const start = performance.now();
    return yield* program.pipe(
      Effect.ensuring(
        Effect.sync(() => {
          metrics.phases[phase] = performance.now() - start;
        })
      )
    );
  }
);
