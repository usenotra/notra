import type { GeoScopeInput } from "@notra/geo-core/types/geo";

import { analyzeGeoSentimentStep } from "./steps/geo-sentiment-steps";

export async function geoSentimentWorkflow(input: GeoScopeInput) {
  "use workflow";
  return analyzeGeoSentimentStep(input);
}
