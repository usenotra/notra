import type { QueryResult } from "@tinybirdco/sdk";

import { GEO_JOURNEY_DEEP_CRAWL_PAGES_SQL } from "../constants/geo-queries";
import type {
  DemoTrafficEvent,
  DemoTrafficParams,
  DemoTrafficProvider,
} from "../types/demo-traffic";
import { toClickHouseDateTime } from "../utils/datetime";
import {
  DAY_MS,
  daysBetween,
  demoProviderSlot,
  demoQueryResult,
  shiftDay,
} from "../utils/demo-pipe";

/**
 * The public demo has no Tinybird. Its AI traffic is generated per request
 * and the GEO traffic endpoints are answered by these TypeScript mirrors of
 * the pipes in `pipes/geo-traffic.ts`, so charts are always current to the
 * hour and nothing is ever ingested.
 */

const LOG_LOOKBACK_DAYS = 90;
const AI_VISITOR_TYPES = new Set(["crawler", "ai_referral"]);

const providerSlot = demoProviderSlot<DemoTrafficProvider>(
  "notra.demo.trafficProvider"
);

/** Registered once at startup by the host app (dashboard or API). */
export const setDemoTrafficProvider = providerSlot.set;

function utcDay(value: string | Date): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function windowOf(params: DemoTrafficParams, now: Date) {
  const days = params.days ?? 30;
  const today = utcDay(now);
  const from = params.date_from || shiftDay(today, -days);
  const to = params.date_to || null;
  const span = params.date_from
    ? daysBetween(params.date_from, params.date_to || today) + 1
    : days;
  const previousFrom = shiftDay(from, -span);
  return {
    isCurrent: (day: string) => day >= from && (to === null || day <= to),
    isPrevious: (day: string) => day >= previousFrom && day < from,
    /** GEO_CAPTURED_WINDOW_SQL compares the timestamp, not the day. */
    inCapturedWindow: (event: DemoTrafficEvent) => {
      const day = utcDay(event.captured_at);
      if (!params.date_from) {
        return (
          Date.parse(`${event.captured_at.replace(" ", "T")}Z`) >=
          now.getTime() - days * DAY_MS
        );
      }
      return day >= from && (to === null || day <= to);
    },
  };
}

function normalizeHost(host: string): string {
  const lower = host.toLowerCase();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}

function matchesHost(event: DemoTrafficEvent, host: string | undefined) {
  if (!host) {
    return true;
  }
  const want = normalizeHost(host);
  const have = normalizeHost(event.host);
  return have === want || have.endsWith(`.${want}`);
}

function listParam(value: string | undefined): Set<string> | null {
  return value ? new Set(value.split(",").filter(Boolean)) : null;
}

async function scopedEvents(
  params: DemoTrafficParams
): Promise<DemoTrafficEvent[]> {
  const provider = providerSlot.get();
  if (!provider) {
    return [];
  }
  const excluded = listParam(params.excluded_sources);
  const events = await provider({
    organizationId: params.organization_id,
    projectId: params.project_id ?? "",
  });
  return events.filter(
    (event) =>
      (!params.project_id || event.project_id === params.project_id) &&
      (!params.site_id || event.site_id === params.site_id) &&
      !excluded?.has(event.source)
  );
}

function maxTime(a: string | null, b: string): string {
  return a === null || b > a ? b : a;
}

function overview(
  events: DemoTrafficEvent[],
  params: DemoTrafficParams,
  now: Date
) {
  const window = windowOf(params, now);
  const groups = new Map<
    string,
    {
      source: string;
      visitor_type: string;
      agent: string;
      category: string;
      confidence: string;
      visits: number;
      previous_visits: number;
      markdown_visits: number;
      paths: Set<string>;
      last_seen_at: string | null;
    }
  >();
  for (const event of events) {
    const day = utcDay(event.captured_at);
    const current = window.isCurrent(day);
    if (!(current || window.isPrevious(day))) {
      continue;
    }
    const key = `${event.source}\u0000${event.visitor_type}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        source: event.source,
        visitor_type: event.visitor_type,
        agent: event.agent,
        category: event.category,
        confidence: event.confidence,
        visits: 0,
        previous_visits: 0,
        markdown_visits: 0,
        paths: new Set(),
        last_seen_at: null,
      };
      groups.set(key, group);
    }
    if (current) {
      group.visits++;
      group.markdown_visits += event.wants_markdown ? 1 : 0;
      group.paths.add(event.path);
      group.last_seen_at = maxTime(group.last_seen_at, event.captured_at);
    } else {
      group.previous_visits++;
    }
  }
  return [...groups.values()]
    .filter((group) => group.visits > 0)
    .sort((a, b) => b.visits - a.visits || a.source.localeCompare(b.source))
    .map((group) => ({
      ...group,
      paths: group.paths.size,
      last_seen_at: group.last_seen_at ?? "",
    }));
}

function timeseries(
  events: DemoTrafficEvent[],
  params: DemoTrafficParams,
  now: Date
) {
  const window = windowOf(params, now);
  const counts = new Map<
    string,
    { day: string; visitor_type: string; source: string; visits: number }
  >();
  for (const event of events) {
    const day = utcDay(event.captured_at);
    if (!window.isCurrent(day)) {
      continue;
    }
    const key = `${day}\u0000${event.visitor_type}\u0000${event.source}`;
    const row = counts.get(key) ?? {
      day,
      visitor_type: event.visitor_type,
      source: event.source,
      visits: 0,
    };
    row.visits++;
    counts.set(key, row);
  }
  return [...counts.values()].sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      a.visitor_type.localeCompare(b.visitor_type) ||
      a.source.localeCompare(b.source)
  );
}

function pages(
  events: DemoTrafficEvent[],
  params: DemoTrafficParams,
  now: Date
) {
  const window = windowOf(params, now);
  const groups = new Map<
    string,
    {
      host: string;
      path: string;
      source: string;
      visitor_type: string;
      visits: number;
      previous_visits: number;
      last_seen_at: string | null;
    }
  >();
  for (const event of events) {
    if (
      !AI_VISITOR_TYPES.has(event.visitor_type) ||
      (params.visitor && event.visitor_type !== params.visitor) ||
      !matchesHost(event, params.host)
    ) {
      continue;
    }
    const day = utcDay(event.captured_at);
    const current = window.isCurrent(day);
    if (!(current || window.isPrevious(day))) {
      continue;
    }
    const key = [event.host, event.path, event.source, event.visitor_type].join(
      "\u0000"
    );
    const group = groups.get(key) ?? {
      host: event.host,
      path: event.path,
      source: event.source,
      visitor_type: event.visitor_type,
      visits: 0,
      previous_visits: 0,
      last_seen_at: null,
    };
    if (current) {
      group.visits++;
      group.last_seen_at = maxTime(group.last_seen_at, event.captured_at);
    } else {
      group.previous_visits++;
    }
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.visits > 0)
    .sort(
      (a, b) =>
        b.visits - a.visits ||
        a.host.localeCompare(b.host) ||
        a.path.localeCompare(b.path)
    )
    .slice(0, params.limit ?? 20)
    .map((group) => ({ ...group, last_seen_at: group.last_seen_at ?? "" }));
}

function log(events: DemoTrafficEvent[], params: DemoTrafficParams, now: Date) {
  const visitorTypes = listParam(params.visitor_type);
  const categories = listParam(params.category);
  const since = toClickHouseDateTime(
    new Date(now.getTime() - LOG_LOOKBACK_DAYS * DAY_MS)
  );
  return events
    .filter(
      (event) =>
        (visitorTypes
          ? visitorTypes.has(event.visitor_type)
          : AI_VISITOR_TYPES.has(event.visitor_type)) &&
        (!categories || categories.has(event.category)) &&
        event.captured_at >= since &&
        matchesHost(event, params.host)
    )
    .sort(
      (a, b) =>
        b.captured_at.localeCompare(a.captured_at) ||
        b.request_id.localeCompare(a.request_id)
    )
    .slice(0, params.limit ?? 50)
    .map((event) => ({
      captured_at: event.captured_at,
      visitor_type: event.visitor_type,
      source: event.source,
      agent: event.agent,
      category: event.category,
      confidence: event.confidence,
      path: event.path,
      host: event.host,
      country: event.country,
      journey_id: event.journey_id,
      wants_markdown: event.wants_markdown,
      ua_snippet: event.ua.slice(0, 180),
    }));
}

interface JourneyRollup {
  journey_id: string;
  source: string;
  visitor_type: string;
  pages: number;
  paths: string[];
  first_seen_at: string;
  last_seen_at: string;
  entry_path: string;
}

function rollupJourneys(events: DemoTrafficEvent[]): JourneyRollup[] {
  const journeys = new Map<string, JourneyRollup>();
  const ordered = [...events].sort((a, b) =>
    a.captured_at.localeCompare(b.captured_at)
  );
  for (const event of ordered) {
    const journey = journeys.get(event.journey_id);
    if (!journey) {
      journeys.set(event.journey_id, {
        journey_id: event.journey_id,
        source: event.source,
        visitor_type: event.visitor_type,
        pages: 1,
        paths: [event.path],
        first_seen_at: event.captured_at,
        last_seen_at: event.captured_at,
        entry_path: event.path,
      });
      continue;
    }
    journey.pages++;
    if (!journey.paths.includes(event.path)) {
      journey.paths.push(event.path);
    }
    journey.last_seen_at = event.captured_at;
  }
  return [...journeys.values()];
}

function journeyEvents(events: DemoTrafficEvent[]) {
  return events.filter(
    (event) =>
      AI_VISITOR_TYPES.has(event.visitor_type) && event.journey_id !== ""
  );
}

function normalizePath(path: string): string {
  const trimmed = (path.split("?")[0] ?? "").replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function comparisonJourneys(
  events: DemoTrafficEvent[],
  params: DemoTrafficParams,
  now: Date
) {
  const window = windowOf(params, now);
  const inRange = journeyEvents(events)
    .filter((event) => {
      const day = utcDay(event.captured_at);
      return window.isCurrent(day) || window.isPrevious(day);
    })
    .map((event) => ({ ...event, path: normalizePath(event.path) }));
  return { window, journeys: rollupJourneys(inRange) };
}

function journeys(
  events: DemoTrafficEvent[],
  params: DemoTrafficParams,
  now: Date
) {
  const window = windowOf(params, now);
  return rollupJourneys(
    journeyEvents(events).filter((event) => window.inCapturedWindow(event))
  )
    .sort(
      (a, b) =>
        b.last_seen_at.localeCompare(a.last_seen_at) ||
        a.journey_id.localeCompare(b.journey_id)
    )
    .slice(0, params.limit ?? 25)
    .map((journey) => ({
      journey_id: journey.journey_id,
      source: journey.source,
      visitor_type: journey.visitor_type,
      pages: journey.pages,
      distinct_paths: journey.paths.length,
      first_seen_at: journey.first_seen_at,
      last_seen_at: journey.last_seen_at,
      entry_path: journey.entry_path,
      sample_paths: journey.paths.slice(0, 1000),
    }));
}

function dailySeries(counts: Map<string, number>) {
  const days = [...counts.keys()].sort();
  return {
    days,
    daily_journeys: days.map((day) => counts.get(day) ?? 0),
  };
}

function journeySources(
  events: DemoTrafficEvent[],
  params: DemoTrafficParams,
  now: Date
) {
  const { window, journeys: rollups } = comparisonJourneys(events, params, now);
  const groups = new Map<
    string,
    {
      source: string;
      visitor_type: string;
      journeys: number;
      previous_journeys: number;
      pages: number;
      single_fetch: number;
      deep_crawls: number;
      last_seen_at: string | null;
      perDay: Map<string, number>;
    }
  >();
  for (const journey of rollups) {
    const key = `${journey.source}\u0000${journey.visitor_type}`;
    const group = groups.get(key) ?? {
      source: journey.source,
      visitor_type: journey.visitor_type,
      journeys: 0,
      previous_journeys: 0,
      pages: 0,
      single_fetch: 0,
      deep_crawls: 0,
      last_seen_at: null,
      perDay: new Map<string, number>(),
    };
    const day = utcDay(journey.first_seen_at);
    if (window.isCurrent(day)) {
      group.journeys++;
      group.pages += journey.pages;
      group.single_fetch += journey.pages <= 1 ? 1 : 0;
      group.deep_crawls +=
        journey.pages >= GEO_JOURNEY_DEEP_CRAWL_PAGES_SQL ? 1 : 0;
      group.last_seen_at = maxTime(group.last_seen_at, journey.last_seen_at);
      group.perDay.set(day, (group.perDay.get(day) ?? 0) + 1);
    } else {
      group.previous_journeys++;
    }
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.journeys > 0 || group.previous_journeys > 0)
    .sort((a, b) => b.journeys - a.journeys || a.source.localeCompare(b.source))
    .map(({ perDay, ...group }) => ({
      ...group,
      last_seen_at: group.last_seen_at ?? "",
      ...dailySeries(perDay),
    }));
}

function journeyPages(
  events: DemoTrafficEvent[],
  params: DemoTrafficParams,
  now: Date
) {
  const { window, journeys: rollups } = comparisonJourneys(events, params, now);
  const pagesByPath = new Map<
    string,
    {
      path: string;
      journeys: number;
      previous_journeys: number;
      entries: number;
      last_seen_at: string | null;
      perDay: Map<string, number>;
    }
  >();
  for (const journey of rollups) {
    const day = utcDay(journey.first_seen_at);
    const current = window.isCurrent(day);
    for (const path of journey.paths) {
      const page = pagesByPath.get(path) ?? {
        path,
        journeys: 0,
        previous_journeys: 0,
        entries: 0,
        last_seen_at: null,
        perDay: new Map<string, number>(),
      };
      if (current) {
        page.journeys++;
        page.entries += journey.entry_path === path ? 1 : 0;
        page.last_seen_at = maxTime(page.last_seen_at, journey.last_seen_at);
        page.perDay.set(day, (page.perDay.get(day) ?? 0) + 1);
      } else {
        page.previous_journeys++;
      }
      pagesByPath.set(path, page);
    }
  }
  const all = [...pagesByPath.values()];
  const totalPaths = all.filter((page) => page.journeys > 0).length;
  const previousTotalPaths = all.filter(
    (page) => page.previous_journeys > 0
  ).length;
  return all
    .filter((page) => page.journeys > 0 || page.previous_journeys > 0)
    .sort((a, b) => b.journeys - a.journeys || a.path.localeCompare(b.path))
    .slice(0, params.limit ?? 500)
    .map(({ perDay, ...page }) => ({
      ...page,
      last_seen_at: page.last_seen_at ?? "",
      ...dailySeries(perDay),
      total_paths: totalPaths,
      previous_total_paths: previousTotalPaths,
    }));
}

function journeyDetail(
  events: DemoTrafficEvent[],
  params: DemoTrafficParams,
  now: Date
) {
  const window = windowOf(params, now);
  return events
    .filter(
      (event) =>
        event.journey_id === params.journey_id && window.inCapturedWindow(event)
    )
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    .slice(0, params.limit ?? 200)
    .map((event) => ({
      captured_at: event.captured_at,
      path: event.path,
      host: event.host,
      method: event.method,
      referer: event.referer,
      country: event.country,
      agent: event.agent,
      category: event.category,
    }));
}

const DEMO_PIPES: Record<
  string,
  (
    events: DemoTrafficEvent[],
    params: DemoTrafficParams,
    now: Date
  ) => unknown[]
> = {
  geo_traffic_overview: overview,
  geo_traffic_timeseries: timeseries,
  geo_traffic_pages: pages,
  geo_traffic_log: log,
  geo_traffic_journeys: journeys,
  geo_journey_sources: journeySources,
  geo_journey_pages: journeyPages,
  geo_journey_detail: journeyDetail,
};

/**
 * Answers a GEO traffic pipe from generated events; null for other pipes.
 * The row type is the pipe's declared output, which the mirrors above build
 * field for field.
 */
export async function queryDemoPipe<TRow>(
  pipe: string,
  params: object
): Promise<QueryResult<TRow> | null> {
  const handler = DEMO_PIPES[pipe];
  if (!handler) {
    return null;
  }
  // Every caller passes the pipe's typed params (`InferParams`).
  const parsed = params as DemoTrafficParams;
  const events = await scopedEvents(parsed);
  return demoQueryResult(handler(events, parsed, new Date()) as TRow[]);
}
