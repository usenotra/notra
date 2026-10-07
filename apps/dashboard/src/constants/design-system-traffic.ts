import type {
  AiTrafficResponse,
  GeoTrafficPoint,
  GeoTrafficSource,
  GeoVisitorType,
} from "@notra/geo-core/types/geo";
import { toGeoTrafficTotals } from "@notra/geo-core/utils/ai-traffic";

function trafficSource(
  source: string,
  visitorType: GeoVisitorType,
  category: string,
  visits: number
): GeoTrafficSource {
  return {
    agent: source,
    category,
    confidence: "verified",
    lastSeenAt: "2026-09-12 14:30:00",
    markdownVisits: 0,
    paths: 1,
    source,
    visits,
    visitorType,
  };
}

const TRAFFIC_DAYS = 30;
const TRAFFIC_END = Date.UTC(2026, 9, 6);
const DAY_MS = 86_400_000;
const REFERRAL_DAY_INDICES = [4, 17, 22, 26];

const CRAWLER_MIX: readonly {
  source: string;
  category: string;
  share: number;
}[] = [
  { source: "GPTBot", category: "training-crawler", share: 0.26 },
  { source: "ClaudeBot", category: "training-crawler", share: 0.19 },
  { source: "PerplexityBot", category: "search-index", share: 0.14 },
  { source: "OAI-SearchBot", category: "assistant-browse", share: 0.12 },
  { source: "Bytespider", category: "training-crawler", share: 0.1 },
  { source: "Applebot", category: "search-index", share: 0.08 },
  { source: "GoogleOther", category: "search-index", share: 0.06 },
  { source: "CCBot", category: "training-crawler", share: 0.05 },
  { source: "Amazonbot", category: "training-crawler", share: 0.05 },
  { source: "meta-externalagent", category: "training-crawler", share: 0.04 },
  { source: "DuckDuckBot", category: "search-index", share: 0.03 },
  { source: "Cursor", category: "assistant-browse", share: 0.03 },
  { source: "OpenCode", category: "assistant-browse", share: 0.02 },
];

const REFERRERS = [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
  "copilot",
  "grok",
] as const;

// A long quiet stretch, then a spike, plus a handful of referrals: the shape the
// real hero has, where the referral series is too small to read next to crawlers.
function dayVolume(index: number): number {
  const wobble = Math.sin(index * 1.7) * 90 + Math.cos(index * 0.9) * 60;
  const late = index >= TRAFFIC_DAYS - 9;
  const spike = index === TRAFFIC_DAYS - 7 ? 1500 : 0;
  return Math.round((late ? 1300 : 420) + wobble + spike);
}

function dayKey(index: number): string {
  const date = new Date(TRAFFIC_END - (TRAFFIC_DAYS - 1 - index) * DAY_MS);
  return date.toISOString().slice(0, 10);
}

const TRAFFIC_POINTS: GeoTrafficPoint[] = Array.from(
  { length: TRAFFIC_DAYS },
  (_, index) => {
    const volume = dayVolume(index);
    const crawlers = CRAWLER_MIX.map((mix) => ({
      day: dayKey(index),
      visitorType: "crawler" as const,
      source: mix.source,
      visits: Math.round(volume * mix.share),
    }));
    if (!REFERRAL_DAY_INDICES.includes(index)) {
      return crawlers;
    }
    return [
      ...crawlers,
      ...REFERRERS.flatMap((source, referrerIndex) =>
        referrerIndex === 0 || (index + referrerIndex) % 2 === 0
          ? [
              {
                day: dayKey(index),
                visitorType: "ai_referral" as const,
                source,
                visits:
                  referrerIndex === 0 && index === REFERRAL_DAY_INDICES[0]
                    ? 2
                    : 1,
              },
            ]
          : []
      ),
    ];
  }
).flat();

export const DESIGN_SYSTEM_TRAFFIC_SOURCES: GeoTrafficSource[] = [
  ...CRAWLER_MIX.map((mix) =>
    trafficSource(
      mix.source,
      "crawler",
      mix.category,
      TRAFFIC_POINTS.filter((point) => point.source === mix.source).reduce(
        (sum, point) => sum + point.visits,
        0
      )
    )
  ),
  ...REFERRERS.map((source) =>
    trafficSource(
      source,
      "ai_referral",
      "assistant-referral",
      TRAFFIC_POINTS.filter((point) => point.source === source).reduce(
        (sum, point) => sum + point.visits,
        0
      )
    )
  ),
];

export const DESIGN_SYSTEM_TRAFFIC_RESPONSE: AiTrafficResponse = {
  configured: true,
  points: TRAFFIC_POINTS,
  previousConversions: null,
  sources: DESIGN_SYSTEM_TRAFFIC_SOURCES,
  totals: toGeoTrafficTotals(DESIGN_SYSTEM_TRAFFIC_SOURCES),
};
