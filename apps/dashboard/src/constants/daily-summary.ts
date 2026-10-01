import type { GeoChangeKind } from "@notra/geo-core/types/geo";

export const DAILY_SUMMARY_MAX_ITEMS = 6;
export const DAILY_SUMMARY_PROMPT_MAX_LENGTH = 80;
export const DAILY_SUMMARY_MAX_COMPETITOR_NAMES = 2;

// Rows worth listing under "What changed". Competitor citations and new
// engines show up on almost every scan, so they stay in the dashboard only.
export const DAILY_SUMMARY_LISTED_CHANGE_KINDS: ReadonlySet<GeoChangeKind> =
  new Set([
    "gained_mention",
    "lost_mention",
    "competitor_displaced",
    "position_improved",
    "position_dropped",
    "citation_added",
    "citation_removed",
  ]);

// Only a mention appearing or disappearing justifies an email. Rank and owned
// citation flips are LLM sampling noise on their own, and a day-level mention
// rate swing without either usually just means prompts were added or removed.
export const DAILY_SUMMARY_TRIGGER_CHANGE_KINDS: ReadonlySet<GeoChangeKind> =
  new Set(["gained_mention", "lost_mention", "competitor_displaced"]);
