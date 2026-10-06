import {
  isTinybirdConfigured,
  queryWebAiOutcomes,
  queryWebAudience,
  queryWebHosts,
  queryWebOverview,
  queryWebPages,
  queryWebSources,
  queryWebTimeseries,
} from "@notra/analytics/tinybird/client";
import { db } from "@notra/db/drizzle";
import { projects, sites } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  WEB_BREAKDOWN_LIMIT,
  WEB_DEFAULT_DAYS,
  WEB_PAGES_LIMIT,
  WEB_SOURCES_LIMIT,
} from "../constants/web-analytics";
import { rememberVisitorTracking } from "../ingest/web-tracking";
import type {
  GeoWindowInput,
  SiteAnalyticsResponse,
  WebAnalyticsBreakdown,
  WebAnalyticsResponse,
  WebAnalyticsScope,
} from "../types/geo";
import { trafficLogHostFilter } from "../utils/geo-project-domains";
import { urlHost } from "../utils/url-host";
import { geoDb, geoQuery } from "./effect";
import { GeoProjectNotFoundError } from "./errors";
import { loadAiTraffic } from "./programs";
import { resolveGeoScope } from "./projects";
import { geoTrafficWindowParams } from "./window";

export function webHostFilter(host: string | undefined): string[] {
  const bare = trafficLogHostFilter(host);
  return bare.length === 0 ? [] : [bare];
}

function toBreakdown(
  rows: readonly { value: string; visitors: number | bigint }[] | undefined
): WebAnalyticsBreakdown[] {
  return (rows ?? []).map((row) => ({
    value: row.value,
    visitors: Number(row.visitors),
  }));
}

const loadWebAnalyticsForScope = Effect.fn("web.analytics")(function* (
  scope: WebAnalyticsScope,
  window: GeoWindowInput,
  tracking: { tracking: boolean; trackVisitors: boolean }
) {
  const base = {
    organization_id: scope.organizationId,
    project_id: scope.projectId ?? "",
    include_unassigned: scope.includeUnassigned ? 1 : 0,
    site_id: scope.siteId,
    ...geoTrafficWindowParams(window, WEB_DEFAULT_DAYS),
  };
  const params = { ...base, hosts: scope.hosts.join(",") };

  const [
    overview,
    timeseries,
    pages,
    sources,
    countries,
    devices,
    outcomes,
    hosts,
  ] = yield* Effect.all(
    [
      geoQuery("web overview query failed", () => queryWebOverview(params)),
      geoQuery("web timeseries query failed", () => queryWebTimeseries(params)),
      geoQuery("web pages query failed", () =>
        queryWebPages({ ...params, limit: WEB_PAGES_LIMIT })
      ),
      geoQuery("web sources query failed", () =>
        queryWebSources({ ...params, limit: WEB_SOURCES_LIMIT })
      ),
      geoQuery("web countries query failed", () =>
        queryWebAudience({
          ...params,
          dimension: "country",
          limit: WEB_BREAKDOWN_LIMIT,
        })
      ),
      geoQuery("web devices query failed", () =>
        queryWebAudience({
          ...params,
          dimension: "device",
          limit: WEB_BREAKDOWN_LIMIT,
        })
      ),
      geoQuery("web outcomes query failed", () => queryWebAiOutcomes(params)),
      geoQuery("web hosts query failed", () =>
        queryWebHosts({ ...base, hosts: "" })
      ),
    ],
    { concurrency: "unbounded" }
  );

  const totalsRow = overview?.data[0];
  const response: WebAnalyticsResponse = {
    configured: isTinybirdConfigured(),
    ...tracking,
    hosts: (hosts?.data ?? []).map((row) => ({
      host: row.host,
      siteId: row.site_id,
      views: Number(row.views),
    })),
    totals: {
      views: Number(totalsRow?.views ?? 0),
      previousViews: Number(totalsRow?.previous_views ?? 0),
      visitors: Number(totalsRow?.visitors ?? 0),
      previousVisitors: Number(totalsRow?.previous_visitors ?? 0),
      sessions: Number(totalsRow?.sessions ?? 0),
      previousSessions: Number(totalsRow?.previous_sessions ?? 0),
      engagedSessions: Number(totalsRow?.engaged_sessions ?? 0),
      aiVisitors: Number(totalsRow?.ai_visitors ?? 0),
      previousAiVisitors: Number(totalsRow?.previous_ai_visitors ?? 0),
    },
    points: (timeseries?.data ?? []).map((row) => ({
      day: row.day,
      views: Number(row.views),
      visitors: Number(row.visitors),
    })),
    pages: (pages?.data ?? []).map((row) => ({
      host: row.host,
      path: row.path,
      views: Number(row.views),
      previousViews: Number(row.previous_views),
      visitors: Number(row.visitors),
      landings: Number(row.landings),
      aiVisitors: Number(row.ai_visitors),
    })),
    sources: (sources?.data ?? []).map((row) => ({
      group: row.referrer_group,
      source: row.referrer_source,
      aiProduct: row.ai_product,
      sessions: Number(row.sessions),
      previousSessions: Number(row.previous_sessions),
      visitors: Number(row.visitors),
    })),
    countries: toBreakdown(countries?.data),
    devices: toBreakdown(devices?.data),
    outcomes: (outcomes?.data ?? []).map((row) => ({
      source: row.source,
      sessions: Number(row.sessions),
      pagesPerSession: Number(row.pages_per_session),
      engagedRate: Number(row.engaged_rate),
    })),
  };
  return response;
});

export const loadWebAnalytics = Effect.fn("web.projectAnalytics")(function* (
  input: { organizationId: string; projectId?: string },
  window: GeoWindowInput,
  host: string | undefined
) {
  const scope = yield* resolveGeoScope(input);
  const tracking = yield* geoDb("visitor tracking lookup failed", async () => {
    if (!scope.projectId) {
      return { tracking: false, trackVisitors: false };
    }
    const [project, site] = await Promise.all([
      db.query.projects.findFirst({
        columns: { trackVisitors: true },
        where: eq(projects.id, scope.projectId),
      }),
      db.query.sites.findFirst({
        columns: { id: true },
        where: and(
          eq(sites.organizationId, scope.organizationId),
          eq(sites.projectId, scope.projectId)
        ),
      }),
    ]);
    const trackVisitors = project?.trackVisitors ?? false;
    return { tracking: trackVisitors || site !== undefined, trackVisitors };
  });
  return yield* loadWebAnalyticsForScope(
    { ...scope, siteId: "", hosts: webHostFilter(host) },
    window,
    tracking
  );
});

export const setVisitorTracking = Effect.fn("web.setTracking")(function* (
  input: { organizationId: string; projectId?: string },
  enabled: boolean
) {
  const scope = yield* resolveGeoScope(input);
  const { projectId } = scope;
  if (!projectId) {
    return yield* Effect.fail(
      new GeoProjectNotFoundError({ projectId: input.projectId ?? "" })
    );
  }
  yield* geoDb("visitor tracking update failed", () =>
    db
      .update(projects)
      .set({ trackVisitors: enabled })
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, scope.organizationId)
        )
      )
  );
  yield* geoDb("visitor tracking cache reset failed", () =>
    rememberVisitorTracking(projectId, enabled)
  );
  return { enabled };
});

export const loadSiteAnalytics = Effect.fn("web.siteAnalytics")(function* (
  site: {
    id: string;
    organizationId: string;
    projectId: string | null;
    publicOrigin: string;
  },
  window: GeoWindowInput
) {
  const host = urlHost(site.publicOrigin);
  const [web, traffic] = yield* Effect.all(
    [
      loadWebAnalyticsForScope(
        {
          organizationId: site.organizationId,
          projectId: null,
          includeUnassigned: false,
          siteId: site.id,
          hosts: [],
        },
        window,
        { tracking: true, trackVisitors: false }
      ),
      loadAiTraffic(
        {
          organizationId: site.organizationId,
          ...(site.projectId ? { projectId: site.projectId } : {}),
        },
        window,
        host ? [host] : []
      ),
    ],
    { concurrency: "unbounded" }
  );
  const response: SiteAnalyticsResponse = { web, traffic };
  return response;
});
