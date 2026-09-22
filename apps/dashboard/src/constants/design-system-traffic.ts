import type {
  AiTrafficResponse,
  GeoTrafficPage,
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

export const DESIGN_SYSTEM_TRAFFIC_SOURCES: GeoTrafficSource[] = [
  trafficSource("meta-externalagent", "crawler", "training-crawler", 2),
  trafficSource("Amazonbot", "crawler", "training-crawler", 2),
  trafficSource("Applebot", "crawler", "search-index", 1),
  trafficSource("Bytespider", "crawler", "training-crawler", 1),
  trafficSource("ClaudeBot", "crawler", "training-crawler", 1),
  trafficSource("PerplexityBot", "crawler", "search-index", 1),
  trafficSource("GPTBot", "crawler", "training-crawler", 2),
  trafficSource("OAI-SearchBot", "crawler", "assistant-browse", 1),
  trafficSource("Claude Code", "crawler", "assistant-browse", 1),
  trafficSource("ClaudeBot", "crawler", "assistant-browse", 1),
  trafficSource("Cursor", "crawler", "assistant-browse", 1),
  trafficSource("DuckDuckBot", "crawler", "assistant-browse", 1),
  trafficSource("unknown-fetcher", "crawler", "assistant-browse", 1),
  trafficSource("OpenCode", "crawler", "assistant-browse", 1),
  trafficSource("chatgpt", "ai_referral", "assistant-referral", 1),
];

export const DESIGN_SYSTEM_TRAFFIC_RESPONSE: AiTrafficResponse = {
  configured: true,
  points: [],
  previousConversions: null,
  sources: DESIGN_SYSTEM_TRAFFIC_SOURCES,
  totals: toGeoTrafficTotals(DESIGN_SYSTEM_TRAFFIC_SOURCES),
};

const TRAFFIC_PAGE_PATHS = [
  "/",
  "/blog",
  "/docs",
  "/pricing",
  "/changelog",
  "/blog/neon-nextjs",
  "/docs/serverless",
  "/about",
  "/careers",
  "/guides/auth",
  "/docs/branching",
  "/compare/planetscale",
  "/blog/edge",
  "/docs/pooling",
  "/security",
  "/blog/release-notes",
] as const;

export const DESIGN_SYSTEM_TRAFFIC_PAGES: GeoTrafficPage[] =
  TRAFFIC_PAGE_PATHS.map((path, index) => {
    const source =
      DESIGN_SYSTEM_TRAFFIC_SOURCES[
        index % DESIGN_SYSTEM_TRAFFIC_SOURCES.length
      ] ?? DESIGN_SYSTEM_TRAFFIC_SOURCES[0]!;
    return {
      host: "example.com",
      path,
      source: source.source,
      visitorType: source.visitorType,
      visits: 4 + ((index * 3) % 17),
      previousVisits: 2 + ((index * 2) % 11),
      lastSeenAt: source.lastSeenAt,
    };
  });
