import type {
  GeoCheckPromptResultRow,
  GeoCheckPromptSummaryRow,
} from "@notra/db/types/geo-checks";

import type { GeoPromptResult, GeoPromptResultSummary } from "../types/geo";
import { geoAnswerSourcesFor } from "./geo-answer-sources";

export function toGeoPromptResult(
  row: GeoCheckPromptResultRow
): GeoPromptResult {
  return {
    promptId: row.promptId,
    engine: row.engine,
    prompt: row.prompt,
    answer: row.answer,
    mentioned: row.mentioned,
    position: row.position,
    sentiment: row.sentiment,
    competitors: row.competitors,
    excerpt: row.excerpt,
    searchQueries: row.grounding.queries,
    sources: geoAnswerSourcesFor(row.grounding, row.sources),
    finishReason: row.finishReason,
    promptTokens: row.promptTokens,
    outputTokens: row.outputTokens,
    reasoningTokens: row.reasoningTokens,
    truncated: row.truncated,
    lastCheckedAt: row.lastCheckedAt.toISOString(),
  };
}

export function toGeoPromptResultSummary(
  row: GeoCheckPromptSummaryRow
): GeoPromptResultSummary {
  return {
    checkId: row.checkId,
    promptId: row.promptId,
    engine: row.engine,
    prompt: row.prompt,
    mentioned: row.mentioned,
    position: row.position,
    sentiment: row.sentiment,
    competitors: row.competitors,
    lastCheckedAt: row.lastCheckedAt.toISOString(),
  };
}
