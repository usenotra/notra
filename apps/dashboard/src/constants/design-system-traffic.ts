import type {
  AiTrafficResponse,
  GeoTrafficSource,
  GeoVisitorType,
} from "@notra/geo-core/types/geo";

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
  totals: {
    aiReferral: 1,
    cited: 7,
    conversions: null,
    crawler: 17,
  },
};
