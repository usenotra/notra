import type { SiteAnalyticsResponse } from "@notra/geo-core/types/geo";
import { trafficDayKey } from "@notra/geo-core/utils/ai-traffic";

import { SITE_TREND_DAY_MS } from "@/constants/site-visitor-trends";
import type { SiteVisitorTrends } from "@/types/site-visitor-trends";

/** Daily series behind the overview stats, one value per day of the window. */
export function siteVisitorTrends(
  data: SiteAnalyticsResponse,
  days: number,
  now = Date.now()
): SiteVisitorTrends {
  const keys = Array.from({ length: days }, (_, index) =>
    new Date(now - (days - 1 - index) * SITE_TREND_DAY_MS)
      .toISOString()
      .slice(0, 10)
  );
  const visitors = new Map<string, number>();
  const views = new Map<string, number>();
  for (const point of data.web.points) {
    const day = trafficDayKey(point.day);
    visitors.set(day, (visitors.get(day) ?? 0) + point.visitors);
    views.set(day, (views.get(day) ?? 0) + point.views);
  }
  const fromAi = new Map<string, number>();
  const agents = new Map<string, number>();
  for (const point of data.traffic.points) {
    let target: Map<string, number> | null = null;
    if (point.visitorType === "ai_referral") {
      target = fromAi;
    } else if (point.visitorType === "crawler") {
      target = agents;
    }
    if (target) {
      const day = trafficDayKey(point.day);
      target.set(day, (target.get(day) ?? 0) + point.visits);
    }
  }
  const series = (source: Map<string, number>) =>
    keys.map((day) => source.get(day) ?? 0);
  return {
    visitors: series(visitors),
    views: series(views),
    fromAi: series(fromAi),
    agents: series(agents),
  };
}
