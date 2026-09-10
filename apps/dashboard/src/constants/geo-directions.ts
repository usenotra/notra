import {
  GEO_SEARCH_LABEL,
  GEO_WITHOUT_SEARCH_LABEL,
} from "@notra/geo-core/constants/geo";
import type {
  GeoCompetitorSharePoint,
  GeoJourney,
  GeoTrafficPage,
} from "@notra/geo-core/types/geo";
import { formatDayLabel } from "@notra/geo-core/utils/day-label";

import { CHART_PRIMARY_COLOR, CHART_SECONDARY_COLOR } from "@/constants/charts";
import type { ChartConfig } from "@/types/charts";
import type {
  GeoDirectionEngineRow,
  GeoDirectionKpi,
  GeoDirectionPrompt,
  GeoDirectionPromptEngine,
  GeoDirectionSourceRow,
  GeoDirectionTab,
  GeoDirectionTone,
} from "@/types/geo-directions";
import { seriesColors } from "@/utils/chart-colors";
import { chartKey } from "@/utils/chart-keys";
import {
  shareOfVoiceRivalIndex,
  shareOfVoiceSliceColor,
} from "@/utils/geo-competitors";
import {
  buildDirectionOverviewEngines,
  buildDirectionTimeseries,
  buildDirectionTrendRows,
  groupDirectionEngineRows,
} from "@/utils/geo-directions";

export const GEO_DIRECTION_TABS: readonly GeoDirectionTab[] = [
  { key: "instrument", label: "Instrument" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "cockpit", label: "Cockpit" },
  { key: "report", label: "Report" },
];

export const GEO_DIRECTIONS_COMPANY = "Notra";
export const GEO_DIRECTIONS_VISIBILITY = 0.54;
export const GEO_DIRECTIONS_VISIBILITY_DELTA = 6;
export const GEO_DIRECTIONS_PROMPT_COUNT = 14;
export const GEO_DIRECTIONS_CHECK_COUNT = 312;
export const GEO_DIRECTIONS_ENGINE_COUNT = 8;
export const GEO_DIRECTIONS_LAST_SCAN = "2026-08-04T09:41:00Z";
export const GEO_DIRECTIONS_LAST_SCAN_LABEL = "Aug 4 09:41";
export const GEO_DIRECTIONS_NEXT_SCAN_LABEL = "14 h";
export const GEO_DIRECTIONS_WEEK_LABEL = "Week of Aug 4";

export const GEO_DIRECTIONS_DELTA_GLYPH: Record<GeoDirectionTone, string> = {
  up: "▲",
  flat: "▬",
  down: "▼",
};

export const GEO_DIRECTIONS_DELTA_CLASS: Record<GeoDirectionTone, string> = {
  up: "text-geo-up",
  flat: "text-muted-foreground",
  down: "text-geo-down",
};

export const GEO_DIRECTIONS_POSITION_CLASS: Record<string, string> = {
  top: "border-geo-up/40 bg-geo-up/10 text-geo-up",
  mid: "border-geo-mid/40 bg-geo-mid/10 text-geo-mid",
  low: "border-border bg-muted text-muted-foreground",
};

export const GEO_DIRECTIONS_ENGINE_SCANS: readonly GeoDirectionEngineRow[] = [
  {
    engine: "openai/gpt-5.4-grounded",
    label: "ChatGPT",
    rate: 0.71,
    delta: 7,
    checks: 64,
    avgPosition: 2,
  },
  {
    engine: "openai/gpt-5.4",
    label: "ChatGPT",
    rate: 0.62,
    delta: 4,
    checks: 64,
    avgPosition: 3,
  },
  {
    engine: "perplexity-sonar",
    label: "Perplexity",
    rate: 0.58,
    delta: 9,
    checks: 62,
    avgPosition: 1,
  },
  {
    engine: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet",
    rate: 0.48,
    delta: 0,
    checks: 61,
    avgPosition: 4,
  },
  {
    engine: "google/gemini-3-flash",
    label: "Gemini",
    rate: 0.35,
    delta: -2,
    checks: 61,
    avgPosition: null,
  },
];

export const GEO_DIRECTIONS_OVERVIEW_ENGINES = buildDirectionOverviewEngines(
  GEO_DIRECTIONS_ENGINE_SCANS,
  GEO_DIRECTIONS_LAST_SCAN
);

export const GEO_DIRECTIONS_ENGINES: readonly GeoDirectionEngineRow[] =
  groupDirectionEngineRows(GEO_DIRECTIONS_ENGINE_SCANS);

export const GEO_DIRECTIONS_TREND_DAYS: readonly string[] = [
  "2026-07-24",
  "2026-07-25",
  "2026-07-26",
  "2026-07-27",
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
  "2026-07-31",
  "2026-08-01",
  "2026-08-02",
  "2026-08-03",
  "2026-08-04",
];

export const GEO_DIRECTIONS_GROUNDED_SERIES: readonly number[] = [
  44, 47, 45, 51, 53, 50, 56, 58, 57, 61, 64, 71,
];

export const GEO_DIRECTIONS_TRAINING_SERIES: readonly number[] = [
  30, 32, 31, 35, 34, 37, 39, 38, 42, 44, 43, 48,
];

export const GEO_DIRECTIONS_TIMESERIES = buildDirectionTimeseries(
  GEO_DIRECTIONS_TREND_DAYS,
  GEO_DIRECTIONS_GROUNDED_SERIES,
  GEO_DIRECTIONS_TRAINING_SERIES,
  "openai/gpt-5.4-grounded",
  "openai/gpt-5.4"
);

export const GEO_DIRECTIONS_TREND_ROWS = buildDirectionTrendRows(
  GEO_DIRECTIONS_TREND_DAYS.map(formatDayLabel),
  GEO_DIRECTIONS_GROUNDED_SERIES,
  GEO_DIRECTIONS_TRAINING_SERIES
);

export const GEO_DIRECTIONS_TREND_CONFIG: ChartConfig = {
  grounded: {
    label: GEO_SEARCH_LABEL,
    colors: seriesColors(CHART_PRIMARY_COLOR),
  },
  training: {
    label: GEO_WITHOUT_SEARCH_LABEL,
    colors: seriesColors(CHART_SECONDARY_COLOR),
  },
};

export const GEO_DIRECTIONS_SHARE: readonly GeoCompetitorSharePoint[] = [
  { brand: "Notra", mentions: 31 },
  { brand: "Jasper", mentions: 24 },
  { brand: "Copy.ai", mentions: 18 },
  { brand: "Writer", mentions: 14 },
  { brand: "Other", mentions: 13 },
];

const GEO_DIRECTIONS_OWN_BRAND = { companyName: GEO_DIRECTIONS_COMPANY };

export const GEO_DIRECTIONS_SHARE_SLICES = GEO_DIRECTIONS_SHARE.map(
  (point, index) => ({
    kind: "brand" as const,
    brand: point.brand,
    mentions: point.mentions,
    slice: chartKey(`${point.brand}-${index}`),
  })
);

export const GEO_DIRECTIONS_SHARE_CONFIG: ChartConfig = Object.fromEntries(
  GEO_DIRECTIONS_SHARE_SLICES.map((row) => [
    row.slice,
    {
      label: row.brand,
      colors: seriesColors(
        shareOfVoiceSliceColor(
          row,
          shareOfVoiceRivalIndex(
            GEO_DIRECTIONS_SHARE_SLICES,
            row.brand,
            GEO_DIRECTIONS_OWN_BRAND
          ),
          undefined,
          GEO_DIRECTIONS_OWN_BRAND
        )
      ),
    },
  ])
);

export const GEO_DIRECTIONS_PROMPT_ENGINES: readonly GeoDirectionPromptEngine[] =
  [
    { engine: "openai/gpt-5.4-grounded", label: "ChatGPT" },
    {
      engine: "anthropic/claude-sonnet-4.6",
      label: "Claude Sonnet",
    },
    { engine: "perplexity-sonar", label: "Perplexity" },
    {
      engine: "google/gemini-3-flash",
      label: "Gemini",
    },
  ];

export const GEO_DIRECTIONS_PROMPTS: readonly GeoDirectionPrompt[] = [
  {
    promptId: "prompt-content-tools",
    prompt: "Best AI content marketing tools",
    positions: [
      { engine: "openai/gpt-5.4-grounded", position: 2 },
      { engine: "anthropic/claude-sonnet-4.6", position: 4 },
      { engine: "perplexity-sonar", position: 1 },
      { engine: "google/gemini-3-flash", position: null },
    ],
  },
  {
    promptId: "prompt-jasper-alternatives",
    prompt: "Jasper alternatives for startups",
    positions: [
      { engine: "openai/gpt-5.4-grounded", position: 1 },
      { engine: "anthropic/claude-sonnet-4.6", position: 3 },
      { engine: "perplexity-sonar", position: 2 },
      { engine: "google/gemini-3-flash", position: 5 },
    ],
  },
  {
    promptId: "prompt-search-visibility",
    prompt: "How to improve AI search visibility",
    positions: [
      { engine: "openai/gpt-5.4-grounded", position: 3 },
      { engine: "anthropic/claude-sonnet-4.6", position: null },
      { engine: "perplexity-sonar", position: 4 },
      { engine: "google/gemini-3-flash", position: null },
    ],
  },
];

export const GEO_DIRECTIONS_SOURCES: readonly GeoDirectionSourceRow[] = [
  {
    source: "chatgpt",
    label: "ChatGPT",
    kind: "crawl",
    visits: 12_480,
    share: 0.68,
  },
  {
    source: "perplexity",
    label: "Perplexity",
    kind: "referral",
    visits: 3214,
    share: 0.18,
  },
  {
    source: "claude",
    label: "Claude",
    kind: "crawl",
    visits: 1892,
    share: 0.1,
  },
  {
    source: "gemini",
    label: "Gemini",
    kind: "referral",
    visits: 640,
    share: 0.04,
  },
];

export const GEO_DIRECTIONS_PAGES: readonly GeoTrafficPage[] = [
  {
    path: "/changelog",
    source: "chatgpt",
    visitorType: "ai_referral",
    visits: 10_412,
    previousVisits: 8320,
    lastSeenAt: "2026-08-04T08:12:00Z",
  },
  {
    path: "/blog/geo-guide",
    source: "perplexity",
    visitorType: "ai_referral",
    visits: 4209,
    previousVisits: 3900,
    lastSeenAt: "2026-08-04T07:48:00Z",
  },
  {
    path: "/docs/sdk",
    source: "claude",
    visitorType: "ai_referral",
    visits: 2138,
    previousVisits: 1800,
    lastSeenAt: "2026-08-03T22:05:00Z",
  },
  {
    path: "/pricing",
    source: "chatgpt",
    visitorType: "ai_referral",
    visits: 1904,
    previousVisits: 2100,
    lastSeenAt: "2026-08-03T19:33:00Z",
  },
];

export const GEO_DIRECTIONS_KPIS: readonly GeoDirectionKpi[] = [
  { label: "AI visits", value: 18_226, hint: "crawlers and referrals" },
  { label: "AI referrals", value: 5741, hint: "humans from an AI answer" },
  { label: "Crawler hits", value: 12_485, hint: "bots fetching your pages" },
  { label: "Journeys", value: 1082, hint: "linked agent sessions" },
];

export const GEO_DIRECTIONS_JOURNEYS: readonly GeoJourney[] = [
  {
    journeyId: "n_ab12x9",
    source: "GPTBot",
    visitorType: "crawler",
    pages: 14,
    distinctPaths: 12,
    firstSeenAt: "2026-08-04T09:02:00Z",
    lastSeenAt: "2026-08-04T09:24:00Z",
    samplePaths: ["/changelog", "/docs/sdk", "/pricing"],
  },
  {
    journeyId: "f_9c31d0",
    source: "ClaudeBot",
    visitorType: "crawler",
    pages: 6,
    distinctPaths: 5,
    firstSeenAt: "2026-08-04T06:41:00Z",
    lastSeenAt: "2026-08-04T06:49:00Z",
    samplePaths: ["/docs/sdk", "/docs/sdk/quickstart"],
  },
  {
    journeyId: "n_k42mfa",
    source: "PerplexityBot",
    visitorType: "crawler",
    pages: 9,
    distinctPaths: 7,
    firstSeenAt: "2026-08-03T21:10:00Z",
    lastSeenAt: "2026-08-03T21:24:00Z",
    samplePaths: ["/blog/geo-guide", "/changelog"],
  },
];

export const DIRECTION_TABLE_HEADER_CLASS =
  "bg-transparent [&_th]:h-8 [&_th]:px-2 [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:text-xs";

export const DIRECTION_TABLE_BODY_CLASS =
  "[&>tr>td]:bg-transparent [&>tr>td]:px-2 [&>tr>td]:py-2.5 [&_tr:first-child>td]:shadow-none [&_tr:first-child>td:first-child]:rounded-tl-none [&_tr:first-child>td:last-child]:rounded-tr-none";
