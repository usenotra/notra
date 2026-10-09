import { db } from "@notra/db/drizzle";
import { siteBuildTelemetry } from "@notra/db/schema";
import type { SiteBuildMetrics } from "@notra/sites-core/types/build-metrics";
import { eq, sql } from "drizzle-orm";
import { Effect } from "effect";

import { boundBuildLog } from "./utils/bound-build-log";
import { runSitesEffect } from "./utils/run-sites-effect";

export const saveBuildTelemetryEffect = Effect.fn("Sites.saveBuildTelemetry")(
  function* (deploymentId: string, metrics: SiteBuildMetrics, log: string) {
    const boundedLog = boundBuildLog(log);
    yield* Effect.tryPromise({
      try: () =>
        db
          .insert(siteBuildTelemetry)
          .values({ deploymentId, metrics, log: boundedLog })
          .onConflictDoUpdate({
            target: siteBuildTelemetry.deploymentId,
            set: { metrics, log: boundedLog, updatedAt: sql`now()` },
          }),
      catch: (error) => error,
    });
  }
);

export function saveBuildTelemetry(
  deploymentId: string,
  metrics: SiteBuildMetrics,
  log: string
): Promise<void> {
  return runSitesEffect(saveBuildTelemetryEffect(deploymentId, metrics, log));
}

export const getBuildTelemetryEffect = Effect.fn("Sites.getBuildTelemetry")(
  function* (deploymentId: string) {
    const [row] = yield* Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(siteBuildTelemetry)
          .where(eq(siteBuildTelemetry.deploymentId, deploymentId))
          .limit(1),
      catch: (error) => error,
    });
    return row ?? null;
  }
);

export function getBuildTelemetry(deploymentId: string) {
  return runSitesEffect(getBuildTelemetryEffect(deploymentId));
}
