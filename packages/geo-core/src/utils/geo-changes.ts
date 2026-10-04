import type { GeoCheckScanComparisonRow } from "@notra/db/types/geo-checks";

import {
  GEO_CHANGE_KIND_ORDER,
  GEO_EMPTY_CHANGES_SUMMARY,
} from "../constants/geo";
import { normalizeCompetitorDomain } from "../geo/domain";
import type {
  GeoChangeCheckState,
  GeoChangeEvent,
  GeoChangesSummary,
  GeoCompetitor,
  GeoScanCheckSnapshot,
} from "../types/geo";

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right)
  );
}

function difference(
  left: readonly string[],
  right: readonly string[]
): string[] {
  const exclude = new Set(right);
  return left.filter((value) => !exclude.has(value));
}

function checkKey(check: Pick<GeoScanCheckSnapshot, "promptId" | "engine">) {
  return `${check.promptId}\u0000${check.engine}`;
}

function stateOf(check: GeoScanCheckSnapshot): GeoChangeCheckState {
  return { mentioned: check.mentioned, position: check.position };
}

export function toGeoScanCheckSnapshot(
  row: GeoCheckScanComparisonRow
): GeoScanCheckSnapshot {
  return {
    promptId: row.promptId,
    prompt: row.prompt,
    engine: row.engine,
    mentioned: row.mentioned,
    ownedSourceCited: row.ownedSourceCited,
    position: row.position,
    competitors: uniqueSorted(row.competitors),
    domains: uniqueSorted(row.grounding.sources.map((source) => source.domain)),
  };
}

function baseEvent(
  current: GeoScanCheckSnapshot,
  previous: GeoScanCheckSnapshot | null
): Omit<GeoChangeEvent, "kind"> {
  return {
    promptId: current.promptId,
    prompt: current.prompt,
    engine: current.engine,
    previous: previous ? stateOf(previous) : null,
    current: stateOf(current),
    competitors: [],
    domains: [],
  };
}

function mentionEvents(
  previous: GeoScanCheckSnapshot,
  current: GeoScanCheckSnapshot
): GeoChangeEvent[] {
  const base = baseEvent(current, previous);
  const newCompetitors = difference(current.competitors, previous.competitors);

  if (!previous.mentioned && current.mentioned) {
    return [{ ...base, kind: "gained_mention" }];
  }

  if (previous.mentioned && !current.mentioned) {
    if (current.competitors.length > 0) {
      return [
        {
          ...base,
          kind: "competitor_displaced",
          competitors: current.competitors,
        },
      ];
    }
    return [{ ...base, kind: "lost_mention" }];
  }

  if (
    !(previous.mentioned && current.mentioned) ||
    previous.position === null ||
    current.position === null ||
    previous.position === current.position
  ) {
    return [];
  }

  if (current.position < previous.position) {
    return [{ ...base, kind: "position_improved" }];
  }

  if (newCompetitors.length > 0) {
    return [
      { ...base, kind: "competitor_displaced", competitors: newCompetitors },
    ];
  }
  return [{ ...base, kind: "position_dropped" }];
}

const competitorsByDomainCache = new WeakMap<
  readonly GeoCompetitor[],
  Map<string, GeoCompetitor>
>();

function competitorsByDomain(
  competitors: readonly GeoCompetitor[]
): Map<string, GeoCompetitor> {
  const cached = competitorsByDomainCache.get(competitors);
  if (cached) {
    return cached;
  }
  const byDomain = new Map<string, GeoCompetitor>();
  for (const competitor of competitors) {
    const tracked = competitor.domain
      ? normalizeCompetitorDomain(competitor.domain)
      : null;
    if (tracked && !byDomain.has(tracked)) {
      byDomain.set(tracked, competitor);
    }
  }
  competitorsByDomainCache.set(competitors, byDomain);
  return byDomain;
}

// Tracked domains can overlap (example.com and cloud.example.com), so the
// longest matching domain wins: an exact host beats any parent domain.
function competitorForDomain(
  domain: string,
  competitors: readonly GeoCompetitor[]
): GeoCompetitor | null {
  const host = normalizeCompetitorDomain(domain);
  if (!host) {
    return null;
  }
  const byDomain = competitorsByDomain(competitors);
  let candidate = host;
  while (candidate.length > 0) {
    const match = byDomain.get(candidate);
    if (match) {
      return match;
    }
    const dot = candidate.indexOf(".");
    if (dot === -1) {
      return null;
    }
    candidate = candidate.slice(dot + 1);
  }
  return null;
}

// Engines reshuffle their web sources on every run, so third-party domain
// churn is noise. Only owned pages and tracked competitors are reported.
function citationEvents(
  previous: GeoScanCheckSnapshot,
  current: GeoScanCheckSnapshot,
  competitors: readonly GeoCompetitor[]
): GeoChangeEvent[] {
  const base = baseEvent(current, previous);
  const events: GeoChangeEvent[] = [];
  if (!previous.ownedSourceCited && current.ownedSourceCited) {
    events.push({ ...base, kind: "citation_added" });
  }
  if (previous.ownedSourceCited && !current.ownedSourceCited) {
    events.push({ ...base, kind: "citation_removed" });
  }

  const citedDomains: string[] = [];
  const citedNames = new Set<string>();
  for (const domain of difference(current.domains, previous.domains)) {
    const competitor = competitorForDomain(domain, competitors);
    if (competitor) {
      citedDomains.push(domain);
      citedNames.add(competitor.name);
    }
  }
  if (citedNames.size > 0) {
    events.push({
      ...base,
      kind: "competitor_cited",
      competitors: [...citedNames],
      domains: citedDomains,
    });
  }
  return events;
}

function compareEvents(left: GeoChangeEvent, right: GeoChangeEvent): number {
  const rank =
    GEO_CHANGE_KIND_ORDER[left.kind] - GEO_CHANGE_KIND_ORDER[right.kind];
  if (rank !== 0) {
    return rank;
  }
  const engine = left.engine.localeCompare(right.engine);
  if (engine !== 0) {
    return engine;
  }
  return left.prompt.localeCompare(right.prompt);
}

export function diffScanChecks(
  previous: readonly GeoScanCheckSnapshot[],
  current: readonly GeoScanCheckSnapshot[],
  competitors: readonly GeoCompetitor[] = []
): GeoChangeEvent[] {
  const previousByKey = new Map(
    previous.map((check) => [checkKey(check), check] as const)
  );
  const previousEngines = new Set(previous.map((check) => check.engine));
  const events: GeoChangeEvent[] = [];

  for (const check of current) {
    const before = previousByKey.get(checkKey(check));
    if (!before) {
      if (!previousEngines.has(check.engine)) {
        events.push({ ...baseEvent(check, null), kind: "new_engine" });
      }
      continue;
    }
    events.push(
      ...mentionEvents(before, check),
      ...citationEvents(before, check, competitors)
    );
  }

  return events.sort(compareEvents);
}

export function summarizeGeoChanges(
  events: readonly GeoChangeEvent[]
): GeoChangesSummary {
  const summary: GeoChangesSummary = { ...GEO_EMPTY_CHANGES_SUMMARY };
  for (const event of events) {
    switch (event.kind) {
      case "gained_mention":
        summary.gained += 1;
        break;
      case "lost_mention":
        summary.lost += 1;
        break;
      case "competitor_displaced":
        if (event.current.mentioned) {
          summary.positionDropped += 1;
        } else {
          summary.lost += 1;
        }
        break;
      case "position_improved":
        summary.positionImproved += 1;
        break;
      case "position_dropped":
        summary.positionDropped += 1;
        break;
      case "citation_added":
        summary.citationsAdded += 1;
        break;
      case "citation_removed":
        summary.citationsRemoved += 1;
        break;
      default:
        break;
    }
  }
  return summary;
}
