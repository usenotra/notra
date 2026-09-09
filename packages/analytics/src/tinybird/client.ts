import { createTimeoutFetch } from "@notra/utils/timeout-fetch";
import {
  type InferParams,
  type IngestResult,
  type QueryResult,
  Tinybird,
} from "@tinybirdco/sdk";

import { bumpAnalyticsVersions, cachedQuery } from "../cache/query-cache";
import type { AnalyticsCacheScope } from "../types/cache";
import type {
  AccountLeaderboardParams,
  AccountLeaderboardRow,
  AiTrafficLogRow,
  AiTrafficOverviewRow,
  AiTrafficTimeseriesRow,
  EngagementTimeseriesParams,
  EngagementTimeseriesRow,
  FollowerGrowthParams,
  FollowerGrowthRow,
  GeoJourneyDetailRow,
  GeoTrafficJourneysRow,
  GeoTrafficLogParams,
  GeoTrafficLogRow,
  GeoTrafficOverviewRow,
  GeoTrafficPagesParams,
  GeoTrafficPagesRow,
  GeoTrafficTimeseriesRow,
  NotraAdoptionRow,
  PostingPerformanceParams,
  PostingPerformanceRow,
  PostMetricsLookupRow,
  SocialOverviewParams,
  SocialOverviewRow,
  TopPostsParams,
  TopPostsRow,
} from "../types/tinybird-endpoints";
import {
  type AiTrafficEventRow,
  aiTrafficEvents,
  type GeoTrafficEventRow,
  geoTrafficEvents,
  type SocialAccountRow,
  type SocialAccountStatsRow,
  type SocialPostRow,
  type SocialPostSourceRow,
  type SocialPostStatsRow,
  socialAccountStats,
  socialAccounts,
  socialPostSources,
  socialPostStats,
  socialPosts,
} from "./datasources";
import {
  aiTrafficLog,
  aiTrafficOverview,
  aiTrafficTimeseries,
} from "./pipes/ai-traffic";
import {
  geoJourneyDetail,
  geoTrafficJourneys,
  geoTrafficLog,
  geoTrafficOverview,
  geoTrafficPages,
  geoTrafficTimeseries,
} from "./pipes/geo-traffic";
import {
  accountLeaderboard,
  engagementTimeseries,
  followerGrowth,
  notraAdoption,
  postingPerformance,
  postMetricsLookup,
  socialOverview,
  topPosts,
} from "./pipes/social";

/**
 * Analytics queries sit on the request path, so a stalled Tinybird must fail
 * instead of holding the request open. The SDK's own default is 30s.
 */
const TINYBIRD_REQUEST_TIMEOUT_MS = 10_000;

export function isTinybirdConfigured(): boolean {
  return Boolean(process.env.TINYBIRD_TOKEN);
}

function createTinybirdClient() {
  return new Tinybird({
    fetch: createTimeoutFetch(TINYBIRD_REQUEST_TIMEOUT_MS),
    token: process.env.TINYBIRD_TOKEN,
    baseUrl:
      process.env.TINYBIRD_BASE_URL ??
      process.env.TINYBIRD_URL ??
      "https://api.tinybird.co",
    devMode: false,
    datasources: {
      socialAccounts,
      socialAccountStats,
      socialPosts,
      socialPostStats,
      socialPostSources,
      aiTrafficEvents,
      geoTrafficEvents,
    },
    pipes: {
      socialOverview,
      engagementTimeseries,
      topPosts,
      followerGrowth,
      postingPerformance,
      notraAdoption,
      postMetricsLookup,
      accountLeaderboard,
      aiTrafficOverview,
      aiTrafficTimeseries,
      aiTrafficLog,
      geoTrafficOverview,
      geoTrafficTimeseries,
      geoTrafficPages,
      geoTrafficLog,
      geoTrafficJourneys,
      geoJourneyDetail,
    },
  });
}

let cachedClient: ReturnType<typeof createTinybirdClient> | null = null;

function getTinybirdClient() {
  if (!isTinybirdConfigured()) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createTinybirdClient();
  }
  return cachedClient;
}

async function ingestRows<TRow>(
  rows: TRow[],
  scope: AnalyticsCacheScope,
  organizationIds: ReadonlyArray<string | null>,
  ingest: (
    client: NonNullable<ReturnType<typeof getTinybirdClient>>,
    batch: TRow[]
  ) => Promise<IngestResult>
): Promise<IngestResult | null> {
  const client = getTinybirdClient();
  if (!client || rows.length === 0) {
    return null;
  }
  const result = await ingest(client, rows);
  await bumpAnalyticsVersions(scope, organizationIds);
  return result;
}

function cachedPipeQuery<TParams extends Record<string, unknown>, TRow>(
  scope: AnalyticsCacheScope,
  pipe: string,
  params: TParams,
  organizationId: string | null,
  query: (
    client: NonNullable<ReturnType<typeof getTinybirdClient>>
  ) => Promise<QueryResult<TRow>>
): Promise<QueryResult<TRow> | null> {
  const client = getTinybirdClient();
  if (!client) {
    return Promise.resolve(null);
  }
  return cachedQuery({
    scope,
    pipe,
    organizationId,
    params,
    fetch: () => query(client),
  });
}

export function ingestSocialAccounts(
  rows: SocialAccountRow[]
): Promise<IngestResult | null> {
  return ingestRows(
    rows,
    "social",
    rows.map((row) => row.organization_id),
    (client, batch) => client.socialAccounts.ingestBatch(batch)
  );
}

export function ingestSocialAccountStats(
  rows: SocialAccountStatsRow[]
): Promise<IngestResult | null> {
  return ingestRows(
    rows,
    "social",
    rows.map((row) => row.organization_id),
    (client, batch) => client.socialAccountStats.ingestBatch(batch)
  );
}

export function ingestSocialPosts(
  rows: SocialPostRow[]
): Promise<IngestResult | null> {
  return ingestRows(
    rows,
    "social",
    rows.map((row) => row.organization_id),
    (client, batch) => client.socialPosts.ingestBatch(batch)
  );
}

export function ingestSocialPostStats(
  rows: SocialPostStatsRow[]
): Promise<IngestResult | null> {
  return ingestRows(
    rows,
    "social",
    rows.map((row) => row.organization_id),
    (client, batch) => client.socialPostStats.ingestBatch(batch)
  );
}

export function ingestSocialPostSources(
  rows: SocialPostSourceRow[]
): Promise<IngestResult | null> {
  return ingestRows(
    rows,
    "social",
    rows.map((row) => row.organization_id),
    (client, batch) => client.socialPostSources.ingestBatch(batch)
  );
}

export function ingestAiTrafficEvents(
  rows: AiTrafficEventRow[]
): Promise<IngestResult | null> {
  return ingestRows(
    rows,
    "traffic",
    rows.map((row) => row.organization_id),
    (client, batch) => client.aiTrafficEvents.ingestBatch(batch)
  );
}

export function ingestGeoTrafficEvents(
  rows: GeoTrafficEventRow[]
): Promise<IngestResult | null> {
  return ingestRows(
    rows,
    "geo",
    rows.map((row) => row.organization_id),
    (client, batch) => client.geoTrafficEvents.ingestBatch(batch)
  );
}

export function querySocialOverview(
  params: SocialOverviewParams
): Promise<QueryResult<SocialOverviewRow> | null> {
  return cachedPipeQuery(
    "social",
    "social_overview",
    params,
    params.organization_id,
    (client) => client.socialOverview.query(params)
  );
}

export function queryEngagementTimeseries(
  params: EngagementTimeseriesParams
): Promise<QueryResult<EngagementTimeseriesRow> | null> {
  return cachedPipeQuery(
    "social",
    "engagement_timeseries",
    params,
    params.organization_id,
    (client) => client.engagementTimeseries.query(params)
  );
}

export function queryTopPosts(
  params: TopPostsParams
): Promise<QueryResult<TopPostsRow> | null> {
  return cachedPipeQuery(
    "social",
    "top_posts",
    params,
    params.organization_id,
    (client) => client.topPosts.query(params)
  );
}

export function queryFollowerGrowth(
  params: FollowerGrowthParams
): Promise<QueryResult<FollowerGrowthRow> | null> {
  return cachedPipeQuery(
    "social",
    "follower_growth",
    params,
    params.organization_id,
    (client) => client.followerGrowth.query(params)
  );
}

export function queryPostingPerformance(
  params: PostingPerformanceParams
): Promise<QueryResult<PostingPerformanceRow> | null> {
  return cachedPipeQuery(
    "social",
    "posting_performance",
    params,
    params.organization_id,
    (client) => client.postingPerformance.query(params)
  );
}

export function queryNotraAdoption(params: {
  organization_id: string;
}): Promise<QueryResult<NotraAdoptionRow> | null> {
  return cachedPipeQuery(
    "social",
    "notra_adoption",
    params,
    params.organization_id,
    (client) => client.notraAdoption.query(params)
  );
}

export function queryAccountLeaderboard(
  params: AccountLeaderboardParams
): Promise<QueryResult<AccountLeaderboardRow> | null> {
  return cachedPipeQuery(
    "social",
    "account_leaderboard",
    params,
    params.organization_id,
    (client) => client.accountLeaderboard.query(params)
  );
}

export function queryPostMetricsLookup(params: {
  organization_id: string;
  post_ids: string[];
}): Promise<QueryResult<PostMetricsLookupRow> | null> {
  return cachedPipeQuery(
    "social",
    "post_metrics_lookup",
    params,
    params.organization_id,
    (client) =>
      // The SDK serializes arrays as repeated query keys (post_ids=a&post_ids=b),
      // but Tinybird's Array() template reads a single comma-separated value, so
      // repeated keys silently collapse to one id. Send one pre-joined value.
      client.postMetricsLookup.query({
        organization_id: params.organization_id,
        post_ids: [params.post_ids.join(",")],
      })
  );
}

export function queryAiTrafficOverview(params: {
  organization_id: string;
  days?: number;
}): Promise<QueryResult<AiTrafficOverviewRow> | null> {
  return cachedPipeQuery(
    "traffic",
    "ai_traffic_overview",
    params,
    params.organization_id,
    (client) => client.aiTrafficOverview.query(params)
  );
}

export function queryAiTrafficTimeseries(params: {
  organization_id: string;
  days?: number;
}): Promise<QueryResult<AiTrafficTimeseriesRow> | null> {
  return cachedPipeQuery(
    "traffic",
    "ai_traffic_timeseries",
    params,
    params.organization_id,
    (client) => client.aiTrafficTimeseries.query(params)
  );
}

export function queryAiTrafficLog(params: {
  organization_id: string;
  limit?: number;
}): Promise<QueryResult<AiTrafficLogRow> | null> {
  return cachedPipeQuery(
    "traffic",
    "ai_traffic_log",
    params,
    params.organization_id,
    (client) => client.aiTrafficLog.query(params)
  );
}

export function queryGeoTrafficOverview(
  params: InferParams<typeof geoTrafficOverview>
): Promise<QueryResult<GeoTrafficOverviewRow> | null> {
  return cachedPipeQuery(
    "geo",
    "geo_traffic_overview",
    params,
    params.organization_id,
    (client) => client.geoTrafficOverview.query(params)
  );
}

export function queryGeoTrafficTimeseries(
  params: InferParams<typeof geoTrafficTimeseries>
): Promise<QueryResult<GeoTrafficTimeseriesRow> | null> {
  return cachedPipeQuery(
    "geo",
    "geo_traffic_timeseries",
    params,
    params.organization_id,
    (client) => client.geoTrafficTimeseries.query(params)
  );
}

export function queryGeoTrafficPages(
  params: GeoTrafficPagesParams
): Promise<QueryResult<GeoTrafficPagesRow> | null> {
  return cachedPipeQuery(
    "geo",
    "geo_traffic_pages",
    params,
    params.organization_id,
    (client) => client.geoTrafficPages.query(params)
  );
}

export function queryGeoTrafficLog(
  params: GeoTrafficLogParams
): Promise<QueryResult<GeoTrafficLogRow> | null> {
  return cachedPipeQuery(
    "geo",
    "geo_traffic_log",
    params,
    params.organization_id,
    (client) => client.geoTrafficLog.query(params)
  );
}

export function queryGeoTrafficJourneys(
  params: InferParams<typeof geoTrafficJourneys>
): Promise<QueryResult<GeoTrafficJourneysRow> | null> {
  return cachedPipeQuery(
    "geo",
    "geo_traffic_journeys",
    params,
    params.organization_id,
    (client) => client.geoTrafficJourneys.query(params)
  );
}

export function queryGeoJourneyDetail(
  params: InferParams<typeof geoJourneyDetail>
): Promise<QueryResult<GeoJourneyDetailRow> | null> {
  return cachedPipeQuery(
    "geo",
    "geo_journey_detail",
    params,
    params.organization_id,
    (client) => client.geoJourneyDetail.query(params)
  );
}
