import type { GeoSearchGapAction } from "@notra/geo-core/types/geo";

import type { GeoGapsTab } from "@/types/components/geo-gaps";

export const GEO_GAPS_TABS: { value: GeoGapsTab }[] = [
  { value: "prompt" },
  { value: "search" },
  { value: "ai" },
];

export const GEO_GAPS_EMPTY_MESSAGE_KEYS = {
  scanning: "scanning",
  "no-scan": "noScan",
  "no-prompt-gaps": "noPromptGaps",
  "no-ai-search-gaps": "noAiSearchGaps",
  "no-search-gaps": "noSearchGaps",
  "no-matches": "noMatches",
} as const;

export const GEO_SEARCH_GAP_ACTION_LABEL_KEYS = {
  create: "newPage",
  update: "updatePage",
  merge: "consolidate",
  ignore: "lowPriority",
} as const satisfies Record<GeoSearchGapAction, string>;
