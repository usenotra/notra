import { parseClickHouseDateTime } from "@notra/analytics/utils/datetime";
import {
  GEO_JOURNEY_BLOG_PREFIXES,
  GEO_JOURNEY_DEEP_CRAWL_PAGES,
  GEO_JOURNEY_DOCS_PREFIXES,
  GEO_JOURNEY_HOME_PATHS,
  GEO_JOURNEY_PATH_KIND_LABELS,
  GEO_JOURNEY_PATH_KINDS,
  GEO_JOURNEY_PATH_LABEL_MAX,
  GEO_JOURNEY_SEARCH_PREFIXES,
} from "@notra/geo-core/constants/geo";
import type {
  GeoJourney,
  GeoJourneyEvent,
  GeoJourneyPathKind,
} from "@notra/geo-core/types/geo";

import type {
  GeoJourneyKindCount,
  GeoJourneyOverview,
  GeoJourneyPathNode,
  GeoJourneyPathRow,
  GeoJourneySourceRow,
  GeoJourneyTrail,
  GeoJourneyTreeNode,
} from "@/types/geo";

const WWW_PREFIX = /^www\./;
const SEARCH_QUERY = /[?&](?:q|query|s|search)=/i;
const TRAIL_GAP_PATH = "…";

const clockFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

export function formatGeoJourneyClock(value: string): string {
  const date = parseClickHouseDateTime(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return clockFormatter.format(date);
}

export function formatGeoRefererSource(referer: string): string {
  const trimmed = referer.trim();
  if (!trimmed) {
    return "";
  }
  try {
    return new URL(trimmed).hostname.replace(WWW_PREFIX, "");
  } catch {
    return trimmed;
  }
}

export function hasGeoJourneyReferers(
  events: readonly GeoJourneyEvent[]
): boolean {
  return events.some((event) => formatGeoRefererSource(event.referer) !== "");
}

export function normalizeGeoJourneyPath(path: string): string {
  const withoutQuery = path.trim().split("?")[0] ?? "";
  if (withoutQuery === "" || withoutQuery === "/") {
    return "/";
  }
  return withoutQuery.replace(/\/+$/, "") || "/";
}

function startsWithPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function classifyGeoJourneyPath(path: string): GeoJourneyPathKind {
  const normalized = normalizeGeoJourneyPath(path);
  if (
    SEARCH_QUERY.test(path) ||
    startsWithPrefix(normalized, GEO_JOURNEY_SEARCH_PREFIXES)
  ) {
    return "search";
  }
  if (GEO_JOURNEY_HOME_PATHS.has(normalized)) {
    return "home";
  }
  if (startsWithPrefix(normalized, GEO_JOURNEY_DOCS_PREFIXES)) {
    return "docs";
  }
  if (startsWithPrefix(normalized, GEO_JOURNEY_BLOG_PREFIXES)) {
    return "blog";
  }
  return "page";
}

export function formatGeoJourneyPathLabel(path: string): string {
  if (path === TRAIL_GAP_PATH) {
    return TRAIL_GAP_PATH;
  }
  const kind = classifyGeoJourneyPath(path);
  if (kind === "home") {
    return "home";
  }
  if (kind === "search") {
    const normalized = normalizeGeoJourneyPath(path);
    if (startsWithPrefix(normalized, GEO_JOURNEY_SEARCH_PREFIXES)) {
      return "search";
    }
  }
  const normalized = normalizeGeoJourneyPath(path);
  if (normalized.length <= GEO_JOURNEY_PATH_LABEL_MAX) {
    return normalized;
  }
  const last = normalized.split("/").filter(Boolean).at(-1);
  return last ? `…/${last}` : normalized.slice(0, GEO_JOURNEY_PATH_LABEL_MAX);
}

export function toGeoJourneyPathNode(path: string): GeoJourneyPathNode {
  return {
    path,
    label: formatGeoJourneyPathLabel(path),
    kind: classifyGeoJourneyPath(path),
  };
}

export function isGeoJourneyTrailGap(path: string): boolean {
  return path === TRAIL_GAP_PATH;
}

function collapseConsecutivePaths(paths: readonly string[]): string[] {
  const collapsed: string[] = [];
  for (const path of paths) {
    const normalized = normalizeGeoJourneyPath(path);
    if (collapsed.at(-1) === normalized) {
      continue;
    }
    collapsed.push(normalized);
  }
  return collapsed;
}

export function compactJourneyPaths(
  paths: readonly string[],
  limit: number
): GeoJourneyTrail {
  const collapsed = collapseConsecutivePaths(paths);
  if (collapsed.length <= limit) {
    return {
      nodes: collapsed.map(toGeoJourneyPathNode),
      omitted: 0,
    };
  }
  const head = Math.ceil(limit / 2);
  const tail = Math.max(limit - head, 1);
  const omitted = collapsed.length - head - tail;
  return {
    nodes: [
      ...collapsed.slice(0, head).map(toGeoJourneyPathNode),
      {
        path: TRAIL_GAP_PATH,
        label: TRAIL_GAP_PATH,
        kind: "page",
      },
      ...collapsed.slice(-tail).map(toGeoJourneyPathNode),
    ],
    omitted,
  };
}

function medianValue(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
  }
  return sorted[middle] ?? 0;
}

function shareOf(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return count / total;
}

export function buildJourneyOverview(
  journeys: readonly GeoJourney[]
): GeoJourneyOverview {
  const sourceCounts = new Map<string, GeoJourneySourceRow>();
  const pathCounts = new Map<string, GeoJourneyPathRow>();

  for (const journey of journeys) {
    const sourceKey = `${journey.source}\0${journey.visitorType}`;
    const sourceRow = sourceCounts.get(sourceKey);
    if (sourceRow) {
      sourceRow.journeys += 1;
    } else {
      sourceCounts.set(sourceKey, {
        source: journey.source,
        visitorType: journey.visitorType,
        journeys: 1,
      });
    }

    const journeyPaths = new Set(
      journey.samplePaths.map((path) => normalizeGeoJourneyPath(path))
    );
    for (const normalized of journeyPaths) {
      const pathRow = pathCounts.get(normalized);
      if (pathRow) {
        pathRow.journeys += 1;
        continue;
      }
      pathCounts.set(normalized, {
        ...toGeoJourneyPathNode(normalized),
        journeys: 1,
      });
    }
  }

  const sources = [...sourceCounts.values()].sort((left, right) => {
    if (right.journeys !== left.journeys) {
      return right.journeys - left.journeys;
    }
    return left.source.localeCompare(right.source);
  });
  const paths = [...pathCounts.values()].sort((left, right) => {
    if (right.journeys !== left.journeys) {
      return right.journeys - left.journeys;
    }
    return left.path.localeCompare(right.path);
  });
  const kindTotals = new Map<GeoJourneyPathKind, number>(
    GEO_JOURNEY_PATH_KINDS.map((kind) => [kind, 0])
  );
  for (const path of paths) {
    kindTotals.set(path.kind, (kindTotals.get(path.kind) ?? 0) + 1);
  }
  const kindCounts: GeoJourneyKindCount[] = GEO_JOURNEY_PATH_KINDS.flatMap(
    (kind) => {
      const count = kindTotals.get(kind) ?? 0;
      return count > 0 ? [{ kind, paths: count }] : [];
    }
  );

  return {
    total: journeys.length,
    sources,
    medianPages: medianValue(journeys.map((journey) => journey.pages)),
    singleFetchShare: shareOf(
      journeys.filter((journey) => journey.pages <= 1).length,
      journeys.length
    ),
    deepShare: shareOf(
      journeys.filter(
        (journey) => journey.pages >= GEO_JOURNEY_DEEP_CRAWL_PAGES
      ).length,
      journeys.length
    ),
    paths,
    kindCounts,
  };
}

export function formatJourneyKindSummary(
  kindCounts: readonly GeoJourneyKindCount[]
): string {
  return kindCounts
    .map(
      (entry) =>
        `${entry.paths} ${GEO_JOURNEY_PATH_KIND_LABELS[entry.kind].toLowerCase()}`
    )
    .join(" · ");
}

export function buildJourneyDepthSummary(
  journeys: readonly GeoJourney[]
): string {
  if (journeys.length === 0) {
    return "";
  }
  const overview = buildJourneyOverview(journeys);
  const share = (value: number) => `${Math.round(value * 100)}%`;
  return `median ${overview.medianPages} ${overview.medianPages === 1 ? "page" : "pages"} · ${share(overview.deepShare)} crawl ${GEO_JOURNEY_DEEP_CRAWL_PAGES}+ · ${share(overview.singleFetchShare)} single-fetch`;
}

function refererPath(event: GeoJourneyEvent): string | null {
  const referer = event.referer.trim();
  if (!referer) {
    return null;
  }
  try {
    const url = new URL(referer);
    const host = event.host.replace(WWW_PREFIX, "");
    if (!host || url.hostname.replace(WWW_PREFIX, "") !== host) {
      return null;
    }
    return normalizeGeoJourneyPath(url.pathname);
  } catch {
    return null;
  }
}

/** Deepest visited section page the path lives under, e.g. /docs for /docs/a. */
function closestVisitedSection(
  path: string,
  nodes: ReadonlyMap<string, GeoJourneyTreeNode>
): GeoJourneyTreeNode | null {
  const segments = path.split("/").filter(Boolean);
  for (let depth = segments.length - 1; depth > 0; depth -= 1) {
    const section = nodes.get(`/${segments.slice(0, depth).join("/")}`);
    if (section) {
      return section;
    }
  }
  return null;
}

/**
 * Rebuilds how an agent moved through the site from its ordered fetches.
 * A same-site referer is the strongest signal. Without one, a page hangs off
 * the section it lives under, else off the page fetched before it. Fetching a
 * page again moves the agent back there, so the next new page branches off it.
 */
export function buildJourneyPathTree(
  events: readonly GeoJourneyEvent[]
): GeoJourneyTreeNode[] {
  const roots: GeoJourneyTreeNode[] = [];
  const nodes = new Map<string, GeoJourneyTreeNode>();
  let cursor: GeoJourneyTreeNode | null = null;

  for (const event of events) {
    const path = normalizeGeoJourneyPath(event.path);
    const existing = nodes.get(path);
    if (existing) {
      existing.hits += 1;
      cursor = existing;
      continue;
    }

    const node: GeoJourneyTreeNode = {
      ...toGeoJourneyPathNode(path),
      id: `${path}:${nodes.size}`,
      hits: 1,
      firstSeenAt: event.capturedAt,
      children: [],
    };
    const referer = refererPath(event);
    const parent =
      (referer && referer !== path ? nodes.get(referer) : undefined) ??
      closestVisitedSection(path, nodes) ??
      cursor;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
    nodes.set(path, node);
    cursor = node;
  }

  return roots;
}

export function countJourneyBranches(roots: readonly GeoJourneyTreeNode[]) {
  let branches = 0;
  const stack = [...roots];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) {
      continue;
    }
    branches += Math.max(node.children.length - 1, 0);
    stack.push(...node.children);
  }
  return branches;
}

/** Docs, posts and everything else, counted by unique page. */
export function journeyPageKindStats(overview: GeoJourneyOverview) {
  const count = (kind: GeoJourneyPathKind) =>
    overview.kindCounts.find((entry) => entry.kind === kind)?.paths ?? 0;
  const docs = count("docs");
  const posts = count("blog");
  const other = overview.paths.length - docs - posts;
  const label = (value: number) =>
    `${value.toLocaleString()} ${value === 1 ? "page" : "pages"}`;
  return [
    { label: GEO_JOURNEY_PATH_KIND_LABELS.docs, value: label(docs) },
    { label: GEO_JOURNEY_PATH_KIND_LABELS.blog, value: label(posts) },
    { label: "Other", value: label(other) },
  ];
}
