import {
  AiBrain01Icon,
  BookOpen01Icon,
  BubbleChatQuestionIcon,
  GitCompareIcon,
  LeftToRightListNumberIcon,
  MoreHorizontalCircle01Icon,
  NeutralIcon,
  Sad01Icon,
  SearchIcon,
  SmileIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import type {
  GeoPresenceStatus,
  GeoPromptIntent,
} from "@notra/geo-core/types/geo";
import { GEO_PROMPT_FILTER_ALL } from "@notra/schemas/constants/dashboard/geo-prompts";

import type { GeoPromptTableFilters } from "@/types/geo";

export const GEO_PROMPT_DEFAULT_FILTERS: GeoPromptTableFilters = {
  q: "",
  intent: GEO_PROMPT_FILTER_ALL,
  tag: GEO_PROMPT_FILTER_ALL,
  source: GEO_PROMPT_FILTER_ALL,
};
export const GEO_PROMPT_TAGS_VISIBLE_COUNT = 3;
export const GEO_PROMPT_FILTER_SELECT_CLASS = "w-36";

export const GEO_PROMPT_LABEL_PILL_CLASS =
  "inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap";

export const GEO_PROMPT_INTENT_ICONS: Record<
  GeoPromptIntent,
  typeof GitCompareIcon
> = {
  comparison: GitCompareIcon,
  list: LeftToRightListNumberIcon,
  how_to: BookOpen01Icon,
  question: BubbleChatQuestionIcon,
  other: MoreHorizontalCircle01Icon,
};

/** Intents are categories, not states, so they share one neutral pill. */
export const GEO_PROMPT_INTENT_PILL_CLASS =
  "border-border bg-muted/50 text-muted-foreground dark:bg-muted/30";

export const GEO_PROMPT_PRESENCE_ICONS: Record<
  GeoPresenceStatus,
  typeof AiBrain01Icon
> = {
  "training-data": AiBrain01Icon,
  "retrieval-only": SearchIcon,
  invisible: ViewOffSlashIcon,
};

export const GEO_PROMPT_PRESENCE_PILL_CLASS: Record<GeoPresenceStatus, string> =
  {
    "training-data": "border-success/25 bg-success/10 text-success",
    "retrieval-only": "border-warning/25 bg-warning/10 text-warning",
    invisible:
      "border-border bg-muted/50 text-muted-foreground dark:bg-muted/30",
  };

export const GEO_LABEL_PILL_CLASS =
  "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs font-medium";

export const GEO_SENTIMENT_ICONS = {
  positive: SmileIcon,
  neutral: NeutralIcon,
  negative: Sad01Icon,
} as const;

export const GEO_SENTIMENT_PILL_CLASS = {
  positive: "border-geo-up/25 bg-geo-up/10 text-geo-up",
  neutral: "border-border bg-muted/50 text-muted-foreground dark:bg-muted/30",
  negative: "border-geo-down/25 bg-geo-down/10 text-geo-down",
} as const;

export const GEO_PROMPT_OUTCOME_LABEL_KEYS = {
  mentionedAndCited: "mentionedAndCited",
  mentioned: "mentioned",
  cited: "ownedSourceCited",
  notMentioned: "notMentioned",
} as const;

/** Illustrative query → prompt pairs for the Search Console empty state. */
export const GSC_SETUP_EXAMPLES = [
  { key: "projectManagement", impressions: 1240 },
  { key: "startupCrm", impressions: 860 },
  { key: "invoicing", impressions: 430 },
] as const;

export const GEO_PROMPTS_PAGE_TABS = [
  "prompts",
  "conversations",
  "suggestions",
  "answers",
] as const;

/** Matches `duration-slow`, the built-in tabs indicator's slide. */
export const GEO_PROMPTS_TAB_INDICATOR_MS = 300;
