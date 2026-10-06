import { logError } from "@notra/ai/utils/server-log";

import "@/workflows/runtime";
import type { GeoScopeInput } from "@notra/geo-core/types/geo";
import { start } from "workflow/api";

import { geoSentimentWorkflow } from "../geo-sentiment";

export async function startGeoSentimentStep(input: GeoScopeInput) {
  "use step";
  try {
    const run = await start(geoSentimentWorkflow, [input]);
    return run.runId;
  } catch (error) {
    logError("Could not start automatic GEO sentiment analysis", error, {
      ...input,
    });
    throw error;
  }
}
