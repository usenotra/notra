import { runAutomaticSentiment } from "@notra/geo-core/geo/sentiment-automation";
import type { GeoScopeInput } from "@notra/geo-core/types/geo";
import { Effect } from "effect";

import { geoCoreDashboardLayer } from "@/lib/geo/configure";

export async function analyzeGeoSentimentStep(input: GeoScopeInput) {
  "use step";
  const result = await Effect.runPromise(
    runAutomaticSentiment(input).pipe(Effect.provide(geoCoreDashboardLayer))
  );
  if (result?.status === "failed") {
    console.warn("Automatic GEO sentiment analysis failed", {
      ...input,
      message: result.message,
    });
  }
  return result;
}
