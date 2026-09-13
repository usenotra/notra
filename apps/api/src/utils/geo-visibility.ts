import type {
  GeoLanguageSharePoint,
  GeoOverviewEngine,
  GeoOverviewResponse,
  GeoPromptResult,
  GeoPromptResultsResponse,
  GeoTimeseriesPoint,
  GeoTimeseriesResponse,
} from "@notra/geo-core/types/geo";

interface VisibilityMetrics {
  readonly mentions: number;
  readonly mentionRate: number;
  readonly citations?: number;
  readonly visibility?: number;
  readonly visibilityRate?: number;
}

/**
 * Fills optional visibility metrics so public API responses always match the
 * OpenAPI schema. Older check rows may omit citations/visibility fields; the
 * dashboard tolerates undefined but the API contract requires numbers.
 */
export function normalizeVisibilityMetrics<T extends VisibilityMetrics>(
  row: T
): T & {
  citations: number;
  visibility: number;
  visibilityRate: number;
} {
  return {
    ...row,
    citations: row.citations ?? 0,
    visibility: row.visibility ?? row.mentions,
    visibilityRate: row.visibilityRate ?? row.mentionRate,
  };
}

function normalizeOverviewEngine(engine: GeoOverviewEngine) {
  return normalizeVisibilityMetrics(engine);
}

function normalizeTimeseriesPoint(point: GeoTimeseriesPoint) {
  return {
    ...point,
    citations: point.citations ?? 0,
    visibility: point.visibility ?? point.mentions,
  };
}

function normalizeLanguageSharePoint(point: GeoLanguageSharePoint) {
  return normalizeVisibilityMetrics(point);
}

function normalizePromptResult(result: GeoPromptResult) {
  return {
    promptId: result.promptId,
    engine: result.engine,
    prompt: result.prompt,
    answer: result.answer,
    mentioned: result.mentioned,
    ownedSourceCited: result.ownedSourceCited ?? false,
    position: result.position,
    sentiment: result.sentiment,
    competitors: result.competitors,
    excerpt: result.excerpt,
    searchQueries: result.searchQueries,
    sources: result.sources,
    lastCheckedAt: result.lastCheckedAt,
  };
}

export function normalizeOverviewResponse(value: GeoOverviewResponse) {
  return {
    configured: value.configured,
    engines: value.engines.map(normalizeOverviewEngine),
  };
}

export function normalizeTimeseriesResponse(value: GeoTimeseriesResponse) {
  return {
    configured: value.configured,
    points: value.points.map(normalizeTimeseriesPoint),
  };
}

export function normalizePromptResultsResponse(
  value: GeoPromptResultsResponse
) {
  return {
    configured: value.configured,
    results: value.results.map(normalizePromptResult),
  };
}

export function normalizeLanguageShareResponse(value: {
  configured: boolean;
  points: GeoLanguageSharePoint[];
}) {
  return {
    configured: value.configured,
    points: value.points.map(normalizeLanguageSharePoint),
  };
}
