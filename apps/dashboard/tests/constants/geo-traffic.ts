import type { GeoTrafficPoint } from "@notra/geo-core/types/geo";

export const points: GeoTrafficPoint[] = [
  { day: "2026-10-01", source: "openai", visitorType: "crawler", visits: 4 },
  {
    day: "2026-10-03",
    source: "openai",
    visitorType: "ai_referral",
    visits: 2,
  },
  { day: "2026-10-03", source: "", visitorType: "crawler", visits: 8 },
];

export const providers = [
  {
    key: "provider-openai",
    label: "OpenAI",
    icon: null,
    visits: 6,
    sources: ["openai"],
  },
];
