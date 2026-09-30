import type {
  GeoOverviewEngine,
  GeoTimeseriesPoint,
} from "@notra/geo-core/types/geo";

const PROVIDERS = [
  { engine: "openai/gpt-5.4-grounded", baseline: 18, growth: 0.5 },
  {
    engine: "anthropic/claude-sonnet-4.6-grounded",
    baseline: 14,
    growth: 0.35,
  },
  { engine: "google/gemini-3-flash-grounded", baseline: 11, growth: 0.28 },
  { engine: "perplexity/sonar", baseline: 8, growth: 0.22 },
  { engine: "xai/grok-4", baseline: 6, growth: 0.18 },
  { engine: "mistral/mistral-large", baseline: 4, growth: 0.12 },
] as const;

const WAVE = [0, 2, -1, 3, 1, 4, 0, -2, 2, 5, 1, 3] as const;

export const DESIGN_SYSTEM_GEO_POINTS: GeoTimeseriesPoint[] = Array.from(
  { length: 30 },
  (_, dayIndex) => {
    const date = new Date(Date.UTC(2026, 6, 21 + dayIndex))
      .toISOString()
      .slice(0, 10);
    return PROVIDERS.map((provider, providerIndex) => ({
      day: date,
      engine: provider.engine,
      checks: 64,
      mentions: Math.max(
        0,
        Math.round(
          provider.baseline +
            dayIndex * provider.growth +
            (WAVE[(dayIndex + providerIndex * 2) % WAVE.length] ?? 0)
        )
      ),
    }));
  }
).flat();

const DESIGN_SYSTEM_GEO_DAYS = [
  ...new Set(DESIGN_SYSTEM_GEO_POINTS.map((point) => point.day)),
];
const DESIGN_SYSTEM_GEO_FIRST_SCAN_DAY = DESIGN_SYSTEM_GEO_DAYS.at(-1);
const DESIGN_SYSTEM_GEO_FEW_DAYS = new Set(DESIGN_SYSTEM_GEO_DAYS.slice(-5));

export const DESIGN_SYSTEM_GEO_FIRST_SCAN_POINTS =
  DESIGN_SYSTEM_GEO_POINTS.filter(
    (point) => point.day === DESIGN_SYSTEM_GEO_FIRST_SCAN_DAY
  );

export const DESIGN_SYSTEM_GEO_POINTS_FEW = DESIGN_SYSTEM_GEO_POINTS.filter(
  (point) => DESIGN_SYSTEM_GEO_FEW_DAYS.has(point.day)
);

export const DESIGN_SYSTEM_GEO_OVERVIEW: GeoOverviewEngine[] = PROVIDERS.map(
  (provider) => {
    const providerPoints = DESIGN_SYSTEM_GEO_POINTS.filter(
      (point) => point.engine === provider.engine
    );
    const checks = providerPoints.reduce((sum, point) => sum + point.checks, 0);
    const mentions = providerPoints.reduce(
      (sum, point) => sum + point.mentions,
      0
    );
    return {
      engine: provider.engine,
      checks,
      mentions,
      mentionRate: checks > 0 ? mentions / checks : 0,
      avgPosition: null,
      lastCheckedAt: "2026-08-19T12:00:00.000Z",
    };
  }
);

export const DESIGN_SYSTEM_GEO_TRACKED_ENGINES: readonly string[] = [
  ...PROVIDERS.filter(
    (provider) => !provider.engine.startsWith("mistral/")
  ).map((provider) => provider.engine),
  "deepseek/deepseek-v4-pro",
];
