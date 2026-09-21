import {
  GEO_TRAFFIC_TREND_CITED_LABEL,
  GEO_TRAFFIC_TREND_CRAWLER_LABEL,
  GEO_TRAFFIC_TREND_REFERRAL_LABEL,
} from "@notra/geo-core/constants/geo";

import type { GeoTrafficSourceBand } from "@/types/geo";

export const TRAFFIC_SOURCE_BANDS = [
  "crawler",
  "cited",
  "ai_referral",
] as const satisfies readonly GeoTrafficSourceBand[];

export const TRAFFIC_SOURCE_BAND_LABELS: Record<GeoTrafficSourceBand, string> =
  {
    crawler: GEO_TRAFFIC_TREND_CRAWLER_LABEL,
    cited: GEO_TRAFFIC_TREND_CITED_LABEL,
    ai_referral: GEO_TRAFFIC_TREND_REFERRAL_LABEL,
  };

export const TRAFFIC_SOURCE_BAND_BADGE: Record<GeoTrafficSourceBand, string> = {
  crawler: "Crawler",
  cited: "Cited in answers",
  ai_referral: "AI referral",
};

export const TRAFFIC_SOURCE_BAND_NOUN: Record<GeoTrafficSourceBand, string> = {
  crawler: "bot",
  cited: "source",
  ai_referral: "source",
};

export const TRAFFIC_SOURCE_STACK_Z_INDEX: Record<
  GeoTrafficSourceBand,
  number
> = {
  crawler: 30,
  cited: 20,
  ai_referral: 10,
};

export const TRAFFIC_SOURCE_STACK_OVERLAP_PX = 20;
export const TRAFFIC_SOURCE_COLLAPSED_BORDER_PX = 2;

/** Floors so band titles ("Crawlers") and source names cannot crush to "Cri". */
export const TRAFFIC_SOURCE_COLUMN_MIN_WIDTH = {
  source: "16rem",
  category: "9.5rem",
  categoryMobile: "8rem",
  visits: "10.5rem",
  visitsMobile: "7.5rem",
  paths: "6rem",
  lastSeenAt: "9rem",
} as const;
