import { parseClickHouseDateTime } from "@notra/analytics/utils/datetime";
import { GEO_TRAFFIC_PAGE_SOURCE_ICON_LIMIT } from "@notra/geo-core/constants/geo";
import type {
  GeoTrafficPage,
  GeoTrafficPoint,
  GeoTrafficSource,
  GeoTrafficSourceGroupDefinition,
} from "@notra/geo-core/types/geo";
import {
  formatGeoAgent,
  formatGeoSource,
  isCitedTrafficSource,
  trafficDayKey,
} from "@notra/geo-core/utils/ai-traffic";
import { resolveEngineIconKey } from "@notra/geo-core/utils/geo-engine-icon";

import type {
  GeoTrafficGroupPage,
  GeoTrafficPurposeTotal,
  GeoTrafficSourceBand,
  GeoTrafficSourceGroup,
} from "@/types/geo";

export function trafficGroupKey(
  band: GeoTrafficSourceBand,
  groupKey: string
): string {
  return `${band}:${groupKey}`;
}

export function resolveTrafficSourceBand(
  source: Pick<GeoTrafficSource, "visitorType" | "category">
): GeoTrafficSourceBand {
  if (source.visitorType === "ai_referral") {
    return "ai_referral";
  }
  if (isCitedTrafficSource(source)) {
    return "cited";
  }
  return "crawler";
}

export function resolveTrafficSourceGroup(
  source: string,
  band: GeoTrafficSourceBand
): GeoTrafficSourceGroupDefinition {
  const engine = resolveEngineIconKey(source);
  if (band === "crawler" || band === "cited") {
    return {
      key: source,
      label: formatGeoAgent(source),
      icon: engine ? source : null,
    };
  }
  return {
    key: source,
    label: formatGeoSource(source),
    icon: source,
  };
}

export function laterTrafficTimestamp(left: string, right: string): string {
  const leftTime = parseClickHouseDateTime(left).getTime();
  const rightTime = parseClickHouseDateTime(right).getTime();
  if (Number.isNaN(leftTime)) {
    return right;
  }
  if (Number.isNaN(rightTime)) {
    return left;
  }
  return rightTime > leftTime ? right : left;
}

function byVisitsDesc(left: GeoTrafficSource, right: GeoTrafficSource): number {
  return right.visits - left.visits;
}

export function groupTrafficSources(
  sources: readonly GeoTrafficSource[]
): GeoTrafficSourceGroup[] {
  const groups = new Map<string, GeoTrafficSourceGroup>();

  for (const source of sources) {
    const band = resolveTrafficSourceBand(source);
    const definition = resolveTrafficSourceGroup(source.source, band);
    const key = trafficGroupKey(band, definition.key);
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, {
        ...definition,
        visitorType: source.visitorType,
        band,
        visits: source.visits,
        markdownVisits: source.markdownVisits,
        paths: source.paths,
        lastSeenAt: source.lastSeenAt,
        categories: source.category ? [source.category] : [],
        members: [source],
      });
      continue;
    }
    existing.visits += source.visits;
    existing.markdownVisits += source.markdownVisits;
    existing.paths = Math.max(existing.paths, source.paths);
    existing.lastSeenAt = laterTrafficTimestamp(
      existing.lastSeenAt,
      source.lastSeenAt
    );
    existing.members.push(source);
  }

  const result = [...groups.values()];
  for (const group of result) {
    group.members.sort(byVisitsDesc);
    const categories = new Set<string>();
    for (const member of group.members) {
      if (member.category.length > 0) {
        categories.add(member.category);
      }
    }
    group.categories = [...categories];
  }
  return result;
}

export function buildTrafficGroupSeries(
  points: readonly GeoTrafficPoint[],
  group: GeoTrafficSourceGroup,
  days: readonly string[]
): number[] {
  const memberSources = new Set(group.members.map((member) => member.source));
  const byDay = new Map<string, number>();
  for (const point of points) {
    if (
      point.visitorType !== group.visitorType ||
      !memberSources.has(point.source)
    ) {
      continue;
    }
    const day = trafficDayKey(point.day);
    byDay.set(day, (byDay.get(day) ?? 0) + point.visits);
  }
  return days.map((day) => byDay.get(day) ?? 0);
}

export function hasTrafficGroupBreakdown(
  group: GeoTrafficSourceGroup
): boolean {
  return group.members.length > 1;
}

/** Distinct company marks for a band header, busiest first. */
export function uniqueTrafficSourceIcons(
  groups: readonly Pick<GeoTrafficSourceGroup, "icon" | "visits">[],
  limit = GEO_TRAFFIC_PAGE_SOURCE_ICON_LIMIT
): { icons: string[]; overflow: number } {
  const seen = new Set<string>();
  const icons: string[] = [];
  const ordered = groups.toSorted((left, right) => right.visits - left.visits);
  for (const group of ordered) {
    if (group.icon === null) {
      continue;
    }
    const key = resolveEngineIconKey(group.icon) ?? group.icon;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    icons.push(group.icon);
  }
  return {
    icons: icons.slice(0, limit),
    overflow: Math.max(0, icons.length - limit),
  };
}

export function trafficVisitShare(visits: number, total: number): string {
  if (total === 0) {
    return "0%";
  }
  return `${Math.round((visits / total) * 100)}%`;
}

export function trafficGroupPurposeTotals(
  group: GeoTrafficSourceGroup
): GeoTrafficPurposeTotal[] {
  const totals = new Map<string, GeoTrafficPurposeTotal>();
  for (const member of group.members) {
    if (member.category.length === 0) {
      continue;
    }
    const existing = totals.get(member.category);
    if (existing === undefined) {
      totals.set(member.category, {
        category: member.category,
        visits: member.visits,
        members: [member.source],
      });
      continue;
    }
    existing.visits += member.visits;
    existing.members.push(member.source);
  }
  return [...totals.values()].sort((left, right) => right.visits - left.visits);
}

/** Busiest pages for a source group, summed across its bots and hosts. */
export function trafficGroupTopPages(
  pages: readonly GeoTrafficPage[],
  group: GeoTrafficSourceGroup,
  limit: number
): GeoTrafficGroupPage[] {
  const members = new Set(group.members.map((member) => member.source));
  const byPage = new Map<string, GeoTrafficGroupPage>();
  for (const page of pages) {
    if (page.visitorType !== group.visitorType || !members.has(page.source)) {
      continue;
    }
    const key = `${page.host}${page.path}`;
    const existing = byPage.get(key);
    if (existing) {
      existing.visits += page.visits;
      if (page.lastSeenAt > existing.lastSeenAt) {
        existing.lastSeenAt = page.lastSeenAt;
      }
    } else {
      byPage.set(key, {
        key,
        host: page.host,
        path: page.path,
        visits: page.visits,
        lastSeenAt: page.lastSeenAt,
      });
    }
  }
  return [...byPage.values()]
    .sort((left, right) => right.visits - left.visits)
    .slice(0, limit);
}

export function trafficGroupPreviousVisits(
  group: GeoTrafficSourceGroup
): number | null {
  let previous = 0;
  for (const member of group.members) {
    if (member.previousVisits === undefined) {
      return null;
    }
    previous += member.previousVisits;
  }
  return previous;
}
