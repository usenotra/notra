import {
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import type {
  AgentReadinessIssueChange,
  AgentReadinessScoreBandKey,
} from "@notra/geo-core/types/agent-readiness";

/** Worst news first in the "Since last scan" card. */
export const AGENT_READINESS_CHANGE_ROW_ORDER = [
  "worsened",
  "added",
  "improved",
  "resolved",
] as const;

export const AGENT_READINESS_CHANGE_ICONS = {
  worsened: ArrowDown01Icon,
  added: AlertCircleIcon,
  improved: ArrowUp01Icon,
  resolved: CheckmarkCircle01Icon,
} as const;

/** Same tones as the GEO "What changed" table. */
export const AGENT_READINESS_CHANGE_TONE_CLASSES = {
  worsened: "text-red-500 dark:text-red-300",
  added: "text-red-500 dark:text-red-300",
  improved: "text-emerald-500 dark:text-emerald-300",
  resolved: "text-emerald-500 dark:text-emerald-300",
} as const;

export const AGENT_READINESS_CHANGES_DEFAULT_SORT = {
  key: "change",
  direction: "asc",
} as const;

export const AGENT_READINESS_CHANGE_BADGE_VARIANT = {
  added: "info",
  improved: "success",
  worsened: "destructive",
} as const satisfies Record<AgentReadinessIssueChange, string>;

/** Literal class names live here so Tailwind's dashboard source scan sees them. */
export const AGENT_READINESS_BAND_TEXT_CLASS = {
  great: "text-emerald-500",
  "needs-improvement": "text-amber-500",
  poor: "text-red-500",
} as const satisfies Record<AgentReadinessScoreBandKey, string>;

export const AGENT_READINESS_BAND_BG_CLASS = {
  great: "bg-emerald-500",
  "needs-improvement": "bg-amber-500",
  poor: "bg-red-500",
} as const satisfies Record<AgentReadinessScoreBandKey, string>;
