import {
  queryGeoCheckById,
  queryGeoCheckPromptSummaries,
  toGeoCheckWindow,
} from "@notra/db/utils/geo-checks";
import { Effect } from "effect";

import type {
  GeoPromptResultDetailInput,
  GeoPromptResultDetailResponse,
  GeoPromptResultSummariesResponse,
  GeoScopeInput,
  GeoWindowInput,
} from "../types/geo";
import {
  toGeoPromptResult,
  toGeoPromptResultSummary,
} from "../utils/geo-prompt-results";
import { geoDb } from "./effect";
import { geoCheckScope, resolveGeoScope } from "./projects";

export const loadGeoPromptResultSummaries = Effect.fn(
  "geo.promptResultSummaries"
)(function* (input: GeoScopeInput, window: GeoWindowInput) {
  const scope = yield* resolveGeoScope(input);
  const rows = yield* geoDb("prompt summaries query failed", () =>
    queryGeoCheckPromptSummaries(geoCheckScope(scope), toGeoCheckWindow(window))
  );
  const response: GeoPromptResultSummariesResponse = {
    configured: true,
    results: rows.map(toGeoPromptResultSummary),
  };
  return response;
});

export const loadGeoPromptResultDetail = Effect.fn("geo.promptResultDetail")(
  function* (input: GeoPromptResultDetailInput) {
    const row = yield* geoDb("prompt detail query failed", () =>
      queryGeoCheckById(input.checkId, input.organizationId)
    );
    const response: GeoPromptResultDetailResponse = {
      result: row ? toGeoPromptResult(row) : null,
    };
    return response;
  }
);
