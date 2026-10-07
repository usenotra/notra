import { logWarn } from "@notra/ai/utils/server-log";
import { runAutomaticSentiment } from "@notra/geo-core/geo/sentiment-automation";
import type { GeoScopeInput } from "@notra/geo-core/types/geo";
import { Effect } from "effect";

import { geoCoreDashboardLayer } from "@/lib/geo/configure";
import { registerWorkflowRuntime } from "@/workflows/runtime";

export async function analyzeGeoSentimentStep(input: GeoScopeInput) {
  "use step";
  await registerWorkflowRuntime();
  const result = await Effect.runPromise(
    runAutomaticSentiment(input).pipe(Effect.provide(geoCoreDashboardLayer))
  ).catch((error: unknown) => {
    logWarn("Automatic GEO sentiment analysis errored", {
      ...input,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  });
  if (result?.status === "failed") {
    logWarn("Automatic GEO sentiment analysis failed", {
      ...input,
      message: result.message,
    });
  }
  return result;
}
