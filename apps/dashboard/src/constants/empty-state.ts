import type { EmptyStateSkillCardLayout } from "@/types/components/empty-state";

export const EMPTY_STATE_TABLE_COLUMNS = {
  content: [192, 80, 96],
  schedule: [140, 120, 88, 72, 80, 56, 88],
  events: [80, 132, 88, 72, 80, 56, 88],
  sitemap: [220, 72, 96],
  prompts: [240, 72, 56],
  personas: [240, 80, 64, 96],
  competitors: [160, 120, 72, 88],
  engines: [180, 160, 100, 120],
  shareOfVoice: [180, 200, 80, 72],
  traffic: [128, 96, 72, 80, 88],
  write: [220, 72, 88],
  gaps: [220, 72, 96, 88],
  shelf: [220, 72, 64, 88, 120],
  feedback: [220, 56, 64, 88, 56],
} as const;

export const EMPTY_STATE_TABLE_ROWS = 6;

export const EMPTY_STATE_CARD_COUNT = {
  content: 3,
  skill: 3,
  reference: 4,
  run: 2,
  integration: 3,
} as const;

export const EMPTY_STATE_ROW_KEYS = [
  "row-a",
  "row-b",
  "row-c",
  "row-d",
  "row-e",
  "row-f",
  "row-g",
  "row-h",
] as const;

export const EMPTY_STATE_COLUMN_KEYS = [
  "col-a",
  "col-b",
  "col-c",
  "col-d",
  "col-e",
  "col-f",
  "col-g",
  "col-h",
] as const;

export const EMPTY_STATE_CARD_KEYS = [
  "card-a",
  "card-b",
  "card-c",
  "card-d",
] as const;

export const EMPTY_STATE_STAT_KEYS = [
  "stat-a",
  "stat-b",
  "stat-c",
  "stat-d",
] as const;

export const EMPTY_STATE_TRAFFIC_STAT_COUNT = 3;

export const EMPTY_STATE_CHART_BARS = [
  28, 44, 36, 52, 40, 48, 32, 56, 42, 38, 50, 34,
] as const;

export const EMPTY_STATE_GUIDELINE_ASSET_KEYS = [
  "asset-a",
  "asset-b",
  "asset-c",
] as const;

export const EMPTY_STATE_GUIDELINE_COLOR_KEYS = [
  "color-a",
  "color-b",
  "color-c",
] as const;

export const EMPTY_STATE_SKILL_CARD_LAYOUTS = [
  {
    title: 108,
    date: 92,
    lines: [
      { key: "a1", width: "100%" },
      { key: "a2", width: "84%" },
      { key: "a3", width: "56%" },
    ],
  },
  {
    title: 148,
    date: 104,
    lines: [
      { key: "b1", width: "94%" },
      { key: "b2", width: "70%" },
    ],
  },
  {
    title: 96,
    date: 88,
    lines: [
      { key: "c1", width: "100%" },
      { key: "c2", width: "88%" },
      { key: "c3", width: "42%" },
    ],
  },
] as const satisfies readonly EmptyStateSkillCardLayout[];

export const EMPTY_STATE_READINESS_TIER_KEYS = [
  "tier-a",
  "tier-b",
  "tier-c",
] as const;

export const EMPTY_STATE_READINESS_ISSUE_COUNT = 3;

export const EMPTY_STATE_READINESS_SCORE_PERCENT = "68%";
