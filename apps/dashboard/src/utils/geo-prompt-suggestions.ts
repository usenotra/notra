import type { GeoSuggestionKeyword } from "@notra/geo-core/types/geo";

import type { SuggestionKeywordTotals } from "@/types/components/geo";

export function suggestionKeywordTotals(
  keywords: readonly GeoSuggestionKeyword[]
): SuggestionKeywordTotals {
  let impressions = 0;
  let clicks = 0;
  let position: number | null = null;
  for (const keyword of keywords) {
    impressions += keyword.impressions;
    clicks += keyword.clicks;
    if (position === null || keyword.position < position) {
      position = keyword.position;
    }
  }
  return {
    impressions,
    clicks,
    position,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
  };
}
