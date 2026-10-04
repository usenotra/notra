import { GEO_COMPETITOR_CONTEXT_LIMIT } from "@notra/geo-core/constants/geo";
import { competitorKey } from "@notra/geo-core/geo/domain";
import type { GeoCompetitor } from "@notra/geo-core/types/geo";

import { GEO_WRITE_FORMAT_RULES } from "@/constants/geo-writer";
import type { WriteFormatRecommendation } from "@/types/components/geo-writer";

export function recommendedContentSubtype(
  prompt: string
): WriteFormatRecommendation {
  const trimmed = prompt.trim();
  for (const rule of GEO_WRITE_FORMAT_RULES) {
    if (rule.pattern.test(trimmed)) {
      return { id: rule.id };
    }
  }
  return { id: "guide" };
}

/**
 * A short list is preselected whole. A long one only preselects the brands
 * recommended instead of the brand; with nothing picked, the server ranks
 * the competitors engines recommend most.
 */
export function defaultWriterCompetitorIds(
  competitors: readonly GeoCompetitor[],
  mentionedCompetitors: readonly string[]
): string[] {
  if (competitors.length <= GEO_COMPETITOR_CONTEXT_LIMIT) {
    return competitors.map((competitor) => competitor.id);
  }
  return competitors
    .filter((competitor) =>
      isWriterCompetitorMentioned(competitor, mentionedCompetitors)
    )
    .slice(0, GEO_COMPETITOR_CONTEXT_LIMIT)
    .map((competitor) => competitor.id);
}

export function isWriterCompetitorMentioned(
  competitor: GeoCompetitor,
  mentionedCompetitors: readonly string[]
): boolean {
  const keys = new Set(
    [competitor.name, ...(competitor.synonyms ?? [])].map(competitorKey)
  );
  return mentionedCompetitors.some((name) => keys.has(competitorKey(name)));
}
