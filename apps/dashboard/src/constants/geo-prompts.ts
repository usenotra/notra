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
import {
  GEO_PROMPT_INTENT_LABELS,
  GEO_PROMPT_INTENTS,
} from "@notra/geo-core/constants/geo";
import type {
  GeoPresenceStatus,
  GeoPromptIntent,
} from "@notra/geo-core/types/geo";
import {
  GEO_PROMPT_FILTER_ALL,
  GEO_PROMPT_INTENT_FILTER_VALUES,
  GEO_PROMPT_SOURCE_FILTER_VALUES,
} from "@notra/schemas/constants/dashboard/geo-prompts";

import type {
  GeoPromptFilterOption,
  GeoPromptIntentFilter,
  GeoPromptSourceFilter,
  GeoPromptTableFilters,
} from "@/types/geo";

export const GEO_PROMPT_DEFAULT_FILTERS: GeoPromptTableFilters = {
  q: "",
  intent: GEO_PROMPT_FILTER_ALL,
  tag: GEO_PROMPT_FILTER_ALL,
  source: GEO_PROMPT_FILTER_ALL,
};
export const GEO_PROMPT_INTENT_FILTER_OPTIONS: GeoPromptFilterOption<GeoPromptIntentFilter>[] =
  [
    { value: GEO_PROMPT_FILTER_ALL, label: "All intents" },
    ...GEO_PROMPT_INTENTS.map((intent) => ({
      value: intent,
      label: GEO_PROMPT_INTENT_LABELS[intent],
    })),
  ];
export const GEO_PROMPT_SOURCE_FILTER_OPTIONS: GeoPromptFilterOption<GeoPromptSourceFilter>[] =
  [
    { value: GEO_PROMPT_FILTER_ALL, label: "All sources" },
    { value: "custom", label: "Custom" },
    { value: "auto", label: "Auto" },
  ];
export const GEO_PROMPT_SOURCE_LABELS: Record<GeoPromptSourceFilter, string> = {
  all: "All sources",
  custom: "Custom",
  auto: "Auto",
};
export const GEO_PROMPT_TAG_FILTER_ALL_LABEL = "All tags";
export const GEO_PROMPT_TAGS_VISIBLE_COUNT = 3;
export const GEO_PROMPT_FILTER_SELECT_CLASS = "w-36";
export const GEO_PROMPT_VIEWS_COPY = {
  trigger: "Views",
  save: "Save current view",
  empty: "No saved views yet",
  saved: "Saved views",
  saveTitle: "Save view",
  saveDescription:
    "Name this combination of search and filters so you can reapply it later.",
  nameLabel: "Name",
  namePlaceholder: "Comparison prompts",
  confirm: "Save view",
  cancel: "Cancel",
  remove: "Delete view",
  applied: "View applied",
  savedToast: "View saved",
  removedToast: "View deleted",
} as const;
export const GEO_PROMPT_TAGS_COPY = {
  column: "Tags",
  intentColumn: "Intent",
  edit: "Edit tags",
  editDescription: "Tags group prompts so you can filter and save views.",
  bulk: "Add tag",
  bulkTitle: "Add tags",
  bulkDescription: "Tags are added to every selected custom prompt.",
  label: "Tags",
  placeholder: "Type a tag and press Enter",
  suggestions: "Tags in use",
  confirm: "Save tags",
  bulkConfirm: "Add tags",
  cancel: "Cancel",
  none: "No tags",
} as const;

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

export const GEO_PROMPT_INTENT_PILL_CLASS: Record<GeoPromptIntent, string> = {
  comparison: "border-info/25 bg-info/10 text-foreground",
  list: "border-border bg-muted/50 text-muted-foreground dark:bg-muted/30",
  how_to: "border-warning/25 bg-warning/10 text-foreground",
  question: "border-info/25 bg-info/10 text-foreground",
  other: "border-border bg-muted/50 text-muted-foreground dark:bg-muted/30",
};

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

export const GEO_PROMPT_PRESENCE_HINTS: Record<GeoPresenceStatus, string> = {
  "training-data":
    "Engines name you from their own knowledge, not only from live search.",
  "retrieval-only":
    "Mentioned only when the engine searches live — not from its own knowledge.",
  invisible: "No engine mentioned you on this prompt yet.",
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
