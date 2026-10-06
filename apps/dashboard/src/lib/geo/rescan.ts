import { flushGeoLog } from "@notra/ai/evlog";
import { logError } from "@notra/ai/utils/server-log";
import { requestGeoRescanForPost } from "@notra/geo-core/geo/rescan";
import type { GeoRescanForPostInput } from "@notra/geo-core/types/geo";
import { Effect } from "effect";

import { geoCoreDashboardLayer } from "@/lib/geo/configure";

export async function requestGeoRescanForPublishedPost(
  input: GeoRescanForPostInput
): Promise<void> {
  try {
    const outcome = await Effect.runPromise(
      Effect.result(
        requestGeoRescanForPost(input).pipe(
          Effect.provide(geoCoreDashboardLayer)
        )
      )
    );
    if (outcome._tag === "Failure") {
      logError("[GEO] Post-publish rescan failed", outcome.failure);
    }
  } catch (error) {
    logError("[GEO] Post-publish rescan failed", error);
  } finally {
    await flushGeoLog();
  }
}
