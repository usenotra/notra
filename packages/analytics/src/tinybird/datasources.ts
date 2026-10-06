import { defineDatasource, engine, type InferRow, t } from "@tinybirdco/sdk";

export const socialAccounts = defineDatasource("social_accounts", {
  description:
    "Connected social account dimension snapshots for Twitter/X and LinkedIn",
  schema: {
    organization_id: t.string(),
    account_id: t.string(),
    provider: t.string().lowCardinality(),
    provider_account_id: t.string(),
    username: t.string(),
    display_name: t.string().nullable(),
    profile_image_url: t.string().nullable(),
    profile_url: t.string().nullable(),
    account_type: t.string().nullable(),
    verified: t.bool(),
    captured_at: t.dateTime(),
  },
  engine: engine.replacingMergeTree({
    sortingKey: ["organization_id", "provider", "provider_account_id"],
    ver: "captured_at",
  }),
});

export const socialAccountStats = defineDatasource("social_account_stats", {
  description:
    "Append-only account-level stat snapshots; metrics a platform does not expose are null",
  schema: {
    organization_id: t.string(),
    account_id: t.string(),
    provider: t.string().lowCardinality(),
    provider_account_id: t.string(),
    captured_at: t.dateTime(),
    followers_count: t.uint64().nullable(),
    following_count: t.uint64().nullable(),
    posts_count: t.uint64().nullable(),
    listed_count: t.uint64().nullable(),
  },
  engine: engine.mergeTree({
    sortingKey: [
      "organization_id",
      "provider",
      "provider_account_id",
      "captured_at",
    ],
    partitionKey: "toYYYYMM(captured_at)",
  }),
});

export const socialPosts = defineDatasource("social_posts", {
  description:
    "Published post dimension rows for Twitter/X and LinkedIn, keyed by platform post id",
  schema: {
    organization_id: t.string(),
    account_id: t.string(),
    provider: t.string().lowCardinality(),
    provider_account_id: t.string(),
    platform_post_id: t.string(),
    url: t.string().nullable(),
    content: t.string(),
    posted_at: t.dateTime(),
    captured_at: t.dateTime(),
  },
  engine: engine.replacingMergeTree({
    sortingKey: ["organization_id", "provider", "platform_post_id"],
    ver: "captured_at",
  }),
});

export const socialPostStats = defineDatasource("social_post_stats", {
  description:
    "Append-only post-level stat snapshots; metrics a platform does not expose are null",
  schema: {
    organization_id: t.string(),
    provider: t.string().lowCardinality(),
    provider_account_id: t.string(),
    platform_post_id: t.string(),
    captured_at: t.dateTime(),
    impressions: t.uint64().nullable(),
    likes: t.uint64().nullable(),
    replies: t.uint64().nullable(),
    reposts: t.uint64().nullable(),
    quotes: t.uint64().nullable(),
    bookmarks: t.uint64().nullable(),
  },
  engine: engine.mergeTree({
    sortingKey: [
      "organization_id",
      "provider",
      "platform_post_id",
      "captured_at",
    ],
    partitionKey: "toYYYYMM(captured_at)",
  }),
});

export const socialPostStatsLatest = defineDatasource(
  "social_post_stats_latest",
  {
    description:
      "Materialized latest-per-post metric states; read with argMaxMerge/maxMerge instead of scanning social_post_stats",
    schema: {
      organization_id: t.string(),
      provider: t.string().lowCardinality(),
      provider_account_id: t.string(),
      platform_post_id: t.string(),
      impressions_state: t.aggregateFunction(
        "argMax",
        t.uint64().nullable(),
        t.dateTime()
      ),
      likes_state: t.aggregateFunction(
        "argMax",
        t.uint64().nullable(),
        t.dateTime()
      ),
      replies_state: t.aggregateFunction(
        "argMax",
        t.uint64().nullable(),
        t.dateTime()
      ),
      reposts_state: t.aggregateFunction(
        "argMax",
        t.uint64().nullable(),
        t.dateTime()
      ),
      quotes_state: t.aggregateFunction(
        "argMax",
        t.uint64().nullable(),
        t.dateTime()
      ),
      bookmarks_state: t.aggregateFunction(
        "argMax",
        t.uint64().nullable(),
        t.dateTime()
      ),
      last_captured_at_state: t.aggregateFunction("max", t.dateTime()),
    },
    engine: engine.aggregatingMergeTree({
      sortingKey: [
        "organization_id",
        "provider",
        "platform_post_id",
        "provider_account_id",
      ],
    }),
    jsonPaths: false,
  }
);

export const socialAccountStatsLatest = defineDatasource(
  "social_account_stats_latest",
  {
    description:
      "Materialized latest-per-account stat states; read with argMaxMerge/maxMerge instead of scanning social_account_stats",
    schema: {
      organization_id: t.string(),
      provider: t.string().lowCardinality(),
      provider_account_id: t.string(),
      account_id_state: t.aggregateFunction("argMax", t.string(), t.dateTime()),
      followers_count_state: t.aggregateFunction(
        "argMax",
        t.uint64().nullable(),
        t.dateTime()
      ),
      following_count_state: t.aggregateFunction(
        "argMax",
        t.uint64().nullable(),
        t.dateTime()
      ),
      posts_count_state: t.aggregateFunction(
        "argMax",
        t.uint64().nullable(),
        t.dateTime()
      ),
      listed_count_state: t.aggregateFunction(
        "argMax",
        t.uint64().nullable(),
        t.dateTime()
      ),
      last_captured_at_state: t.aggregateFunction("max", t.dateTime()),
    },
    engine: engine.aggregatingMergeTree({
      sortingKey: ["organization_id", "provider", "provider_account_id"],
    }),
    jsonPaths: false,
  }
);

export const socialPostSources = defineDatasource("social_post_sources", {
  description:
    "Append-only ledger marking posts that were published through Notra",
  schema: {
    organization_id: t.string(),
    provider: t.string().lowCardinality(),
    provider_account_id: t.string(),
    platform_post_id: t.string(),
    source: t.string().lowCardinality(),
    captured_at: t.dateTime(),
  },
  engine: engine.mergeTree({
    sortingKey: ["organization_id", "provider", "platform_post_id"],
  }),
});

export const geoTrafficEvents = defineDatasource("geo_traffic_events", {
  description:
    "Append-only log of AI requests captured by the geo SDK, classified into AI crawlers and AI assistant referrals; human requests are dropped at ingest",
  schema: {
    organization_id: t.string(),
    project_id: t.string().lowCardinality(),
    captured_at: t.dateTime(),
    visitor_type: t.string().lowCardinality(),
    source: t.string().lowCardinality(),
    agent: t.string().lowCardinality(),
    category: t.string().lowCardinality(),
    confidence: t.string().lowCardinality(),
    path: t.string(),
    host: t.string().lowCardinality(),
    method: t.string().lowCardinality(),
    referer: t.string(),
    ua: t.string(),
    country: t.string().lowCardinality(),
    language: t.string().lowCardinality(),
    request_id: t.string(),
    journey_id: t.string(),
    wants_markdown: t.bool(),
  },
  engine: engine.mergeTree({
    sortingKey: ["organization_id", "visitor_type", "captured_at"],
    partitionKey: "toYYYYMM(captured_at)",
    ttl: "captured_at + toIntervalDay(396)",
    settings: { ttl_only_drop_parts: 1 },
  }),
});

export const geoTrafficDaily = defineDatasource("geo_traffic_daily", {
  description:
    "Daily rollup of geo_traffic_events per organization, visitor type and source; read with countMerge/uniqExactMerge/maxMerge/anyMerge",
  schema: {
    day: t.date(),
    organization_id: t.string(),
    project_id: t.string().lowCardinality(),
    visitor_type: t.string().lowCardinality(),
    source: t.string().lowCardinality(),
    visits_state: t.aggregateFunction("count"),
    markdown_visits_state: t.aggregateFunction("countIf", t.uint8()),
    paths_state: t.aggregateFunction("uniqExact", t.string()),
    last_seen_state: t.aggregateFunction("max", t.dateTime()),
    agent_state: t.aggregateFunction("any", t.string().lowCardinality()),
    category_state: t.aggregateFunction("any", t.string().lowCardinality()),
    confidence_state: t.aggregateFunction("any", t.string().lowCardinality()),
  },
  engine: engine.aggregatingMergeTree({
    sortingKey: [
      "organization_id",
      "project_id",
      "visitor_type",
      "source",
      "day",
    ],
    partitionKey: "toYYYYMM(day)",
  }),
  jsonPaths: false,
});

export const geoTrafficPagesByHostDaily = defineDatasource(
  "geo_traffic_pages_by_host_daily",
  {
    description:
      "Daily rollup of geo_traffic_events per organization, visitor type, source, host and path; read with countMerge/maxMerge. Populate with geo_traffic_pages_by_host_daily_backfill before switching readers off geo_traffic_events.",
    schema: {
      day: t.date(),
      organization_id: t.string(),
      project_id: t.string().lowCardinality(),
      visitor_type: t.string().lowCardinality(),
      source: t.string().lowCardinality(),
      host: t.string(),
      path: t.string(),
      visits_state: t.aggregateFunction("count"),
      last_seen_state: t.aggregateFunction("max", t.dateTime()),
    },
    engine: engine.aggregatingMergeTree({
      sortingKey: [
        "organization_id",
        "project_id",
        "visitor_type",
        "source",
        "host",
        "day",
        "path",
      ],
      partitionKey: "toYYYYMM(day)",
    }),
    jsonPaths: false,
  }
);

export const webPageViews = defineDatasource("web_page_views", {
  description:
    "Append-only log of human page views (Notra Sites and opted-in SDK projects); AI referrals are also recorded in geo_traffic_events",
  schema: {
    organization_id: t.string(),
    project_id: t.string().lowCardinality(),
    site_id: t.string().lowCardinality(),
    captured_at: t.dateTime(),
    host: t.string().lowCardinality(),
    path: t.string(),
    status: t.uint16(),
    visitor_id: t.string(),
    session_id: t.string(),
    session_page_index: t.uint16(),
    referrer_host: t.string(),
    referrer_group: t.string().lowCardinality(),
    referrer_source: t.string().lowCardinality(),
    ai_product: t.string().lowCardinality(),
    utm_source: t.string().lowCardinality(),
    utm_medium: t.string().lowCardinality(),
    utm_campaign: t.string(),
    country: t.string().lowCardinality(),
    device: t.string().lowCardinality(),
    browser: t.string().lowCardinality(),
    os: t.string().lowCardinality(),
    request_id: t.string(),
  },
  engine: engine.mergeTree({
    sortingKey: ["organization_id", "project_id", "host", "captured_at"],
    partitionKey: "toYYYYMM(captured_at)",
    ttl: "captured_at + toIntervalDay(90)",
    settings: { ttl_only_drop_parts: 1 },
  }),
});

export const webPagesDaily = defineDatasource("web_pages_daily", {
  description:
    "Daily rollup of web_page_views per site, host, path and status; read with countMerge/uniqMerge/countIfMerge/uniqIfMerge",
  schema: {
    day: t.date(),
    organization_id: t.string(),
    project_id: t.string().lowCardinality(),
    site_id: t.string().lowCardinality(),
    host: t.string().lowCardinality(),
    path: t.string(),
    status: t.uint16(),
    views_state: t.aggregateFunction("count"),
    visitors_state: t.aggregateFunction("uniq", t.string()),
    sessions_state: t.aggregateFunction("countIf", t.uint8()),
    engaged_sessions_state: t.aggregateFunction("countIf", t.uint8()),
    ai_visitors_state: t.aggregateFunction("uniqIf", t.string(), t.uint8()),
  },
  engine: engine.aggregatingMergeTree({
    sortingKey: [
      "organization_id",
      "project_id",
      "site_id",
      "host",
      "day",
      "path",
      "status",
    ],
    partitionKey: "toYYYYMM(day)",
  }),
  jsonPaths: false,
});

export const webSourcesDaily = defineDatasource("web_sources_daily", {
  description:
    "Daily rollup of session landings in web_page_views per referrer and campaign; read with countMerge/uniqMerge",
  schema: {
    day: t.date(),
    organization_id: t.string(),
    project_id: t.string().lowCardinality(),
    site_id: t.string().lowCardinality(),
    host: t.string().lowCardinality(),
    referrer_group: t.string().lowCardinality(),
    referrer_source: t.string().lowCardinality(),
    ai_product: t.string().lowCardinality(),
    utm_source: t.string().lowCardinality(),
    utm_medium: t.string().lowCardinality(),
    utm_campaign: t.string(),
    sessions_state: t.aggregateFunction("count"),
    visitors_state: t.aggregateFunction("uniq", t.string()),
  },
  engine: engine.aggregatingMergeTree({
    sortingKey: [
      "organization_id",
      "project_id",
      "site_id",
      "host",
      "day",
      "referrer_group",
      "referrer_source",
      "utm_source",
    ],
    partitionKey: "toYYYYMM(day)",
  }),
  jsonPaths: false,
});

export const webAudienceDaily = defineDatasource("web_audience_daily", {
  description:
    "Daily rollup of web_page_views visitors per country, device, browser and OS; read with countMerge/uniqMerge",
  schema: {
    day: t.date(),
    organization_id: t.string(),
    project_id: t.string().lowCardinality(),
    site_id: t.string().lowCardinality(),
    host: t.string().lowCardinality(),
    country: t.string().lowCardinality(),
    device: t.string().lowCardinality(),
    browser: t.string().lowCardinality(),
    os: t.string().lowCardinality(),
    views_state: t.aggregateFunction("count"),
    visitors_state: t.aggregateFunction("uniq", t.string()),
  },
  engine: engine.aggregatingMergeTree({
    sortingKey: [
      "organization_id",
      "project_id",
      "site_id",
      "host",
      "day",
      "country",
      "device",
      "browser",
    ],
    partitionKey: "toYYYYMM(day)",
  }),
  jsonPaths: false,
});

export type SocialAccountRow = InferRow<typeof socialAccounts>;
export type SocialAccountStatsRow = InferRow<typeof socialAccountStats>;
export type SocialPostRow = InferRow<typeof socialPosts>;
export type SocialPostStatsRow = InferRow<typeof socialPostStats>;
export type SocialPostSourceRow = InferRow<typeof socialPostSources>;
export type GeoTrafficEventRow = InferRow<typeof geoTrafficEvents>;
export type WebPageViewRow = InferRow<typeof webPageViews>;
