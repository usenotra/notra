import { logError } from "@notra/ai/utils/server-log";
import type { GeoScopeInput } from "@notra/geo-core/types/geo";
import { start } from "workflow/api";

import { registerWorkflowRuntime } from "@/workflows/runtime";

import { geoSentimentWorkflow } from "../geo-sentiment";

export async function startGeoSentimentStep(input: GeoScopeInput) {
  "use step";
  await registerWorkflowRuntime();
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
