import type {
  GeoOverviewEngine,
  GeoPromptResultSummary,
  GeoTimeseriesPoint,
} from "@notra/geo-core/types/geo";

const PROVIDERS = [
  { engine: "openai/gpt-5.4-grounded", baseline: 18, growth: 0.5 },
  { engine: "openai/gpt-5.4", baseline: 9, growth: 0.15 },
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

const DESIGN_SYSTEM_GEO_PROMPTS = [
  {
    prompt: "Best tools to turn GitHub releases into a changelog",
    position: 2,
    rivals: ["Jasper", "Copy.ai", "Canva"],
  },
  {
    prompt: "How do I write release notes my users actually read?",
    position: 1,
    rivals: ["Jasper", "Copy.ai"],
  },
  {
    prompt: "AI writing assistant for developer marketing",
    position: null,
    rivals: ["Jasper", "Copy.ai", "Canva"],
  },
  {
    prompt: "Automate product update emails from commits",
    position: 3,
    rivals: ["Jasper", "Copy.ai", "Canva"],
  },
  {
    prompt: "Alternatives to Jasper for technical content",
    position: null,
    rivals: ["Jasper", "Copy.ai", "Canva"],
  },
  {
    prompt: "Which AI tools write good LinkedIn posts for startups?",
    position: null,
    rivals: ["Jasper", "Copy.ai", "Canva"],
  },
  {
    prompt: "Keep docs and changelog in sync automatically",
    position: 2,
    rivals: ["Copy.ai"],
  },
  {
    prompt: "Content tools that connect to Linear and GitHub",
    position: null,
    rivals: ["Jasper", "Canva"],
  },
] as const;

const DESIGN_SYSTEM_GEO_SEARCH_RESULTS: GeoPromptResultSummary[] =
  DESIGN_SYSTEM_GEO_PROMPTS.map((entry, index) => ({
    checkId: `design-system-check-${index}`,
    promptId: `design-system-prompt-${index}`,
    engine: "openai/gpt-5.4-grounded",
    prompt: entry.prompt,
    mentioned: entry.position !== null,
    ownedSourceCited: index === 4,
    position: entry.position,
    sentiment: null,
    competitors: [...entry.rivals],
    lastCheckedAt: "2026-08-19T12:00:00.000Z",
  }));

// Without search the model only remembers the brand on the prompts it ranks
// first, which gives the memory tab its own, weaker ranking.
const DESIGN_SYSTEM_GEO_MEMORY_RESULTS: GeoPromptResultSummary[] =
  DESIGN_SYSTEM_GEO_SEARCH_RESULTS.map((result) => ({
    ...result,
    checkId: `${result.checkId}-memory`,
    engine: "openai/gpt-5.4",
    mentioned: result.position === 1,
    ownedSourceCited: false,
    position: result.position === 1 ? 2 : null,
  }));

export const DESIGN_SYSTEM_GEO_PROMPT_RESULTS: GeoPromptResultSummary[] = [
  ...DESIGN_SYSTEM_GEO_SEARCH_RESULTS,
  ...DESIGN_SYSTEM_GEO_MEMORY_RESULTS,
];
