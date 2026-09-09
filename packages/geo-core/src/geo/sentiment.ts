import {
  queryGeoCheckSentiment,
  queryGeoCheckSentimentEvidence,
  toGeoCheckWindow,
} from "@notra/db/utils/geo-checks";
import { Effect } from "effect";

import { GEO_SENTIMENT_EVIDENCE_LIMIT } from "../constants/geo-sentiment";
import type { GeoScopeInput, GeoWindowInput } from "../types/geo";
import type {
  GeoSentimentEvidenceInput,
  GeoSentimentResponse,
  GeoSentimentEvidenceResponse,
} from "../types/geo-sentiment";
import { summarizeSentiment } from "../utils/geo-sentiment";
import {
  sentimentPeriods,
  sentimentPeriodPoints,
} from "../utils/sentiment-period";
import { geoDb } from "./effect";
import { geoCheckScope, resolveGeoScope } from "./projects";

export const loadGeoSentiment = Effect.fn("geo.sentiment")(function* (
  input: GeoScopeInput,
  window: GeoWindowInput
) {
  const scope = yield* resolveGeoScope(input);
  const periods = sentimentPeriods(window);
  const rows = yield* geoDb("sentiment query failed", () =>
    queryGeoCheckSentiment(
      geoCheckScope(scope),
      toGeoCheckWindow(periods.current)
    )
  );
  const previousRows = yield* geoDb("previous sentiment query failed", () =>
    queryGeoCheckSentiment(
      geoCheckScope(scope),
      toGeoCheckWindow(periods.previous)
    )
  );
  const summary = summarizeSentiment(rows);
  const previousSummary = summarizeSentiment(previousRows);
  const response: GeoSentimentResponse = {
    configured: true as const,
    summary,
    engines: [...new Set(rows.map((row) => row.engine))].map((engine) => ({
      engine,
      ...summarizeSentiment(rows.filter((row) => row.engine === engine)),
    })),
    points: sentimentPeriodPoints(rows, periods.current.from, periods.length),
    comparison: {
      current: periods.current,
      previous: periods.previous,
      summary: previousSummary,
      points: sentimentPeriodPoints(
        previousRows,
        periods.previous.from,
        periods.length
      ),
      delta:
        summary.score === null || previousSummary.score === null
          ? null
          : summary.score - previousSummary.score,
    },
  };
  return response;
});

export const loadGeoSentimentEvidence = Effect.fn("geo.sentimentEvidence")(
  function* (input: GeoSentimentEvidenceInput, window: GeoWindowInput) {
    const scope = yield* resolveGeoScope(input);
    const rows = yield* geoDb("sentiment evidence query failed", () =>
      queryGeoCheckSentimentEvidence(
        geoCheckScope(scope),
        toGeoCheckWindow(window),
        GEO_SENTIMENT_EVIDENCE_LIMIT + 1,
        input.cursor
      )
    );
    const items = rows
      .slice(0, GEO_SENTIMENT_EVIDENCE_LIMIT)
      .map((row) => ({ ...row, capturedAt: row.capturedAt.toISOString() }));
    const last = items.at(-1);
    const response: GeoSentimentEvidenceResponse = {
      items,
      nextCursor:
        rows.length > GEO_SENTIMENT_EVIDENCE_LIMIT && last
          ? {
              capturedAt: last.capturedAt,
              id: last.id,
              projectId: scope.projectId,
              scope: JSON.stringify([
                input.organizationId,
                input.projectId ?? null,
                input.from ?? null,
                input.to ?? null,
                input.days ?? null,
              ]),
            }
          : null,
    };
    return response;
  }
);
