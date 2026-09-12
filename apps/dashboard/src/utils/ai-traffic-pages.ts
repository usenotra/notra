import { GEO_TRAFFIC_HOST_ALL } from "@notra/geo-core/constants/geo";
import type { GeoTrafficPage } from "@notra/geo-core/types/geo";
import { formatGeoSource } from "@notra/geo-core/utils/ai-traffic";
import {
  formatTrafficLocation,
  matchesProjectHost,
} from "@notra/geo-core/utils/geo-project-domains";

import type { GeoTrafficPageGroup, GeoTrafficPageSource } from "@/types/geo";
import { laterTrafficTimestamp } from "@/utils/ai-traffic-groups";

function pageGroupKey(page: Pick<GeoTrafficPage, "host" | "path">): string {
  return `${page.host}\n${page.path}`;
}

function pageSourceKey(page: GeoTrafficPage): string {
  return `${page.visitorType}:${formatGeoSource(page.source).toLowerCase()}`;
}

function byVisitsDesc(
  left: GeoTrafficPageSource,
  right: GeoTrafficPageSource
): number {
  return right.visits - left.visits;
}

export function groupTrafficPages(
  pages: readonly GeoTrafficPage[]
): GeoTrafficPageGroup[] {
  const groups = new Map<string, GeoTrafficPageGroup>();
  const sourcesByGroup = new Map<string, Map<string, GeoTrafficPageSource>>();

  for (const page of pages) {
    const key = pageGroupKey(page);
    const existing = groups.get(key);
    const group: GeoTrafficPageGroup = existing ?? {
      host: page.host,
      path: page.path,
      visits: 0,
      lastSeenAt: page.lastSeenAt,
      sources: [],
    };
    if (existing === undefined) {
      groups.set(key, group);
      sourcesByGroup.set(key, new Map());
    }

    group.visits += page.visits;
    if (page.previousVisits !== undefined) {
      group.previousVisits = (group.previousVisits ?? 0) + page.previousVisits;
    }
    group.lastSeenAt = laterTrafficTimestamp(group.lastSeenAt, page.lastSeenAt);

    const sources = sourcesByGroup.get(key);
    const sourceKey = pageSourceKey(page);
    const source = sources?.get(sourceKey);
    if (source === undefined) {
      sources?.set(sourceKey, {
        source: page.source,
        visitorType: page.visitorType,
        visits: page.visits,
        lastSeenAt: page.lastSeenAt,
      });
      continue;
    }
    source.visits += page.visits;
    source.lastSeenAt = laterTrafficTimestamp(
      source.lastSeenAt,
      page.lastSeenAt
    );
  }

  const result = [...groups.values()];
  for (const group of result) {
    group.sources = Array.from(
      sourcesByGroup.get(pageGroupKey(group))?.values() ?? []
    ).sort(byVisitsDesc);
  }
  return result;
}

export function trafficPageSourcesLabel(group: GeoTrafficPageGroup): string {
  const count = group.sources.length;
  return `${count} ${count === 1 ? "source" : "sources"}`;
}

export function filterTrafficPageGroups(
  groups: readonly GeoTrafficPageGroup[],
  query: string
): GeoTrafficPageGroup[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...groups];
  }
  return groups.filter((group) => {
    const haystack = formatTrafficLocation(
      group.host,
      group.path
    ).toLowerCase();
    return haystack.includes(needle);
  });
}

export function filterTrafficPageGroupsByHost(
  groups: readonly GeoTrafficPageGroup[],
  host: string
): GeoTrafficPageGroup[] {
  const selected = host.trim();
  if (selected.length === 0 || selected === "all") {
    return [...groups];
  }
  return groups.filter(
    (group) =>
      group.host === selected || matchesProjectHost(group.host, [selected])
  );
}

export function trafficHostsFromPages(
  pages: readonly Pick<GeoTrafficPage, "host">[]
): string[] {
  const hostSet = new Set<string>();
  for (const page of pages) {
    if (page.host.length > 0) {
      hostSet.add(page.host);
    }
  }
  return [...hostSet].toSorted((left, right) => left.localeCompare(right));
}

export function trafficHostSelectOptions(
  hosts: readonly string[],
  selected: string
): string[] {
  const selectedHost = selected.trim();
  const unique = new Set(
    hosts.filter((host) => host.length > 0 && host !== GEO_TRAFFIC_HOST_ALL)
  );
  if (
    selectedHost.length > 0 &&
    selectedHost !== GEO_TRAFFIC_HOST_ALL &&
    !unique.has(selectedHost)
  ) {
    unique.add(selectedHost);
  }
  return [...unique].toSorted((left, right) => left.localeCompare(right));
}
