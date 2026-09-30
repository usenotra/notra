import {
  GEO_TRAFFIC_GROUPS_BY_ENGINE,
  GEO_TRAFFIC_OTHER_GROUP,
  GEO_TRAFFIC_TREND_CRAWLER_KEY,
  GEO_TRAFFIC_TREND_REFERRAL_KEY,
} from "@notra/geo-core/constants/geo";
import type {
  GeoTrafficPoint,
  GeoTrafficSource,
  GeoTrafficTrendRow,
  GeoVisitorType,
} from "@notra/geo-core/types/geo";
import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import { resolveEngineIconKey } from "@notra/geo-core/utils/geo-engine-icon";

import {
  CHART_MUTED_COLOR,
  GEO_TRAFFIC_PROVIDER_COLORS,
} from "@/constants/charts";
import type { TrafficTrendProvider, TrafficTrendSeries } from "@/types/geo";
import { seriesColors } from "@/utils/chart-colors";

const SERIES_KEY_UNSAFE = /[^a-z0-9]+/gi;

export function trafficTrendProviderKey(groupKey: string): string {
  return `provider-${groupKey.replace(SERIES_KEY_UNSAFE, "-").toLowerCase()}`;
}

export function trafficTrendProviderTypeKey(
  providerKey: string,
  visitorType: GeoVisitorType
): string {
  return `${providerKey}-${visitorType}`;
}

export function buildTrafficTrendProviders(
  sources: readonly GeoTrafficSource[]
): TrafficTrendProvider[] {
  const providers = new Map<string, TrafficTrendProvider>();
  for (const source of sources) {
    const engine = resolveEngineIconKey(source.source);
    const definition =
      (engine ? GEO_TRAFFIC_GROUPS_BY_ENGINE[engine] : undefined) ??
      GEO_TRAFFIC_OTHER_GROUP;
    const key = trafficTrendProviderKey(definition.key);
    const existing = providers.get(key);
    if (existing === undefined) {
      providers.set(key, {
        key,
        label: definition.label,
        icon: definition.icon,
        visits: source.visits,
        sources: [source.source],
      });
      continue;
    }
    existing.visits += source.visits;
    if (!existing.sources.includes(source.source)) {
      existing.sources.push(source.source);
    }
  }
  return [...providers.values()].sort(
    (left, right) => right.visits - left.visits
  );
}

export function buildTrafficTrendSeries(
  providers: readonly TrafficTrendProvider[]
): TrafficTrendSeries[] {
  return providers.map((provider, index) => ({
    key: provider.key,
    label: provider.label,
    icon: provider.icon,
    colors: seriesColors(
      GEO_TRAFFIC_PROVIDER_COLORS[index % GEO_TRAFFIC_PROVIDER_COLORS.length] ??
        CHART_MUTED_COLOR
    ),
  }));
}

export function buildTrafficTrendRowsForProviders(
  points: readonly GeoTrafficPoint[],
  providers: readonly TrafficTrendProvider[],
  days: readonly string[],
  hiddenKeys: ReadonlySet<string>,
  locale: string
): GeoTrafficTrendRow[] {
  const dayIndex = new Map(days.map((day, index) => [day, index]));
  const providerBySource = new Map<string, TrafficTrendProvider>();
  for (const provider of providers) {
    for (const source of provider.sources) {
      providerBySource.set(source, provider);
    }
  }
  const rows: GeoTrafficTrendRow[] = days.map((day) => {
    const row: GeoTrafficTrendRow = {
      day: formatDayLabel(day, locale),
      rawDay: day,
      [GEO_TRAFFIC_TREND_CRAWLER_KEY]: 0,
      [GEO_TRAFFIC_TREND_REFERRAL_KEY]: 0,
    };
    for (const provider of providers) {
      row[provider.key] = 0;
      row[trafficTrendProviderTypeKey(provider.key, "crawler")] = 0;
      row[trafficTrendProviderTypeKey(provider.key, "ai_referral")] = 0;
    }
    return row;
  });
  for (const point of points) {
    const row = rows[dayIndex.get(String(point.day).slice(0, 10)) ?? -1];
    const provider = providerBySource.get(point.source);
    if (row === undefined || provider === undefined) {
      continue;
    }
    row[provider.key] = Number(row[provider.key] ?? 0) + point.visits;
    const typeKey = trafficTrendProviderTypeKey(
      provider.key,
      point.visitorType
    );
    row[typeKey] = Number(row[typeKey] ?? 0) + point.visits;
    if (hiddenKeys.has(provider.key)) {
      continue;
    }
    if (point.visitorType === "crawler") {
      row[GEO_TRAFFIC_TREND_CRAWLER_KEY] += point.visits;
    } else if (point.visitorType === "ai_referral") {
      row[GEO_TRAFFIC_TREND_REFERRAL_KEY] += point.visits;
    }
  }
  return rows;
}

export function toggleTrafficTrendKey(
  hidden: ReadonlySet<string>,
  key: string
): Set<string> {
  const next = new Set(hidden);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
}
