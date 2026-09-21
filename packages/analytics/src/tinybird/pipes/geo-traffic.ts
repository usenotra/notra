import {
  defineCopyPipe,
  defineEndpoint,
  defineMaterializedView,
  node,
  p,
  t,
} from "@tinybirdco/sdk";

import {
  GEO_CAPTURED_COMPARISON_WINDOW_SQL,
  GEO_CAPTURED_CURRENT_CONDITION,
  GEO_CAPTURED_PREVIOUS_CONDITION,
  GEO_CAPTURED_WINDOW_SQL,
  GEO_DAY_COMPARISON_WINDOW_SQL,
  GEO_DAY_CURRENT_CONDITION,
  GEO_DAY_PREVIOUS_CONDITION,
  GEO_DAY_WINDOW_SQL,
  GEO_EXCLUDED_SOURCES_PARAMS,
  GEO_EXCLUDED_SOURCES_SQL,
  GEO_HOST_FILTER_PARAMS,
  GEO_HOST_FILTER_SQL,
  GEO_JOURNEY_DEEP_CRAWL_PAGES_SQL,
  GEO_JOURNEY_FIRST_SEEN_CURRENT_CONDITION,
  GEO_PROJECT_SCOPE_PARAMS,
  GEO_PROJECT_SCOPE_SQL,
  GEO_WINDOW_PARAMS,
} from "../../constants/geo-queries";
import { geoTrafficDaily, geoTrafficPagesByHostDaily } from "../datasources";

const GEO_TRAFFIC_PAGES_BY_HOST_DAILY_SQL = `
          SELECT
            toDate(captured_at) AS day,
            organization_id,
            project_id,
            visitor_type,
            source,
            host,
            path,
            countState() AS visits_state,
            maxState(captured_at) AS last_seen_state
          FROM geo_traffic_events
          GROUP BY day, organization_id, project_id, visitor_type, source, host, path
        `;

export const geoTrafficDailyMv = defineMaterializedView(
  "geo_traffic_daily_mv",
  {
    description:
      "Rolls geo_traffic_events into geo_traffic_daily on every ingest",
    datasource: geoTrafficDaily,
    nodes: [
      node({
        name: "traffic_daily",
        sql: `
        SELECT
          toDate(captured_at) AS day,
          organization_id,
          project_id,
          visitor_type,
          source,
          countState() AS visits_state,
          countIfState(toUInt8(wants_markdown)) AS markdown_visits_state,
          uniqExactState(path) AS paths_state,
          maxState(captured_at) AS last_seen_state,
          anyState(agent) AS agent_state,
          anyState(category) AS category_state,
          anyState(confidence) AS confidence_state
        FROM geo_traffic_events
        GROUP BY day, organization_id, project_id, visitor_type, source
      `,
      }),
    ],
  }
);

export const geoTrafficPagesByHostDailyMv = defineMaterializedView(
  "geo_traffic_pages_by_host_daily_mv",
  {
    description:
      "Rolls geo_traffic_events into geo_traffic_pages_by_host_daily on every ingest",
    datasource: geoTrafficPagesByHostDaily,
    nodes: [
      node({
        name: "traffic_pages_by_host_daily",
        sql: GEO_TRAFFIC_PAGES_BY_HOST_DAILY_SQL,
      }),
    ],
  }
);

export const geoTrafficPagesByHostDailyBackfill = defineCopyPipe(
  "geo_traffic_pages_by_host_daily_backfill",
  {
    description:
      "On-demand replace of geo_traffic_pages_by_host_daily from geo_traffic_events. Run once after deploy, before switching geo_traffic_pages off the raw event table.",
    datasource: geoTrafficPagesByHostDaily,
    copy_mode: "replace",
    copy_schedule: "@on-demand",
    nodes: [
      node({
        name: "traffic_pages_by_host_backfill",
        sql: GEO_TRAFFIC_PAGES_BY_HOST_DAILY_SQL,
      }),
    ],
  }
);

export const geoTrafficOverview = defineEndpoint("geo_traffic_overview", {
  description:
    "Captured site visits grouped by traffic source and visitor type over the trailing window",
  params: {
    organization_id: p.string().describe("Organization id"),
    ...GEO_PROJECT_SCOPE_PARAMS,
    ...GEO_EXCLUDED_SOURCES_PARAMS,
    ...GEO_WINDOW_PARAMS,
  },
  nodes: [
    node({
      name: "per_source",
      sql: `
        SELECT
          source,
          visitor_type,
          anyMerge(agent_state) AS agent,
          anyMerge(category_state) AS category,
          anyMerge(confidence_state) AS confidence,
          countMergeIf(visits_state, (${GEO_DAY_CURRENT_CONDITION})) AS visits,
          countMergeIf(visits_state, (${GEO_DAY_PREVIOUS_CONDITION})) AS previous_visits,
          countIfMergeIf(markdown_visits_state, (${GEO_DAY_CURRENT_CONDITION})) AS markdown_visits,
          uniqExactMergeIf(paths_state, (${GEO_DAY_CURRENT_CONDITION})) AS paths,
          maxMergeIf(last_seen_state, (${GEO_DAY_CURRENT_CONDITION})) AS last_seen_at
        FROM geo_traffic_daily
        WHERE organization_id = {{String(organization_id)}}
          ${GEO_PROJECT_SCOPE_SQL}
          ${GEO_EXCLUDED_SOURCES_SQL}
          ${GEO_DAY_COMPARISON_WINDOW_SQL}
        GROUP BY source, visitor_type
        HAVING visits > 0
        ORDER BY visits DESC, source ASC
      `,
    }),
  ],
  output: {
    source: t.string(),
    visitor_type: t.string(),
    agent: t.string(),
    category: t.string(),
    confidence: t.string(),
    visits: t.uint64(),
    previous_visits: t.uint64(),
    markdown_visits: t.uint64(),
    paths: t.uint64(),
    last_seen_at: t.dateTime(),
  },
});

export const geoTrafficTimeseries = defineEndpoint("geo_traffic_timeseries", {
  description: "Daily captured visits per visitor type",
  params: {
    organization_id: p.string().describe("Organization id"),
    ...GEO_PROJECT_SCOPE_PARAMS,
    ...GEO_EXCLUDED_SOURCES_PARAMS,
    ...GEO_WINDOW_PARAMS,
  },
  nodes: [
    node({
      name: "daily",
      sql: `
        SELECT
          day,
          visitor_type,
          source,
          countMerge(visits_state) AS visits
        FROM geo_traffic_daily
        WHERE organization_id = {{String(organization_id)}}
          ${GEO_PROJECT_SCOPE_SQL}
          ${GEO_EXCLUDED_SOURCES_SQL}
          ${GEO_DAY_WINDOW_SQL}
        GROUP BY day, visitor_type, source
        ORDER BY day ASC, visitor_type ASC, source ASC
      `,
    }),
  ],
  output: {
    day: t.date(),
    visitor_type: t.string(),
    source: t.string(),
    visits: t.uint64(),
  },
});

export const geoTrafficPages = defineEndpoint("geo_traffic_pages", {
  description:
    "Top pages by AI traffic source, optionally narrowed to one visitor type",
  params: {
    organization_id: p.string().describe("Organization id"),
    ...GEO_PROJECT_SCOPE_PARAMS,
    ...GEO_EXCLUDED_SOURCES_PARAMS,
    ...GEO_WINDOW_PARAMS,
    visitor: p
      .string()
      .optional("")
      .describe("Visitor type filter, empty for every AI visitor"),
    limit: p.int32().optional(20).describe("Max rows"),
    ...GEO_HOST_FILTER_PARAMS,
  },
  nodes: [
    node({
      name: "top_pages",
      // Reads the raw event table on purpose: the by-host rollup would
      // require a one-time backfill to serve full history, and the 30s
      // query cache bounds the raw scan cost.
      sql: `
        SELECT
          host,
          path,
          source,
          visitor_type,
          countIf(${GEO_CAPTURED_CURRENT_CONDITION}) AS visits,
          countIf(${GEO_CAPTURED_PREVIOUS_CONDITION}) AS previous_visits,
          maxIf(captured_at, (${GEO_CAPTURED_CURRENT_CONDITION})) AS last_seen_at
        FROM geo_traffic_events
        WHERE organization_id = {{String(organization_id)}}
          ${GEO_PROJECT_SCOPE_SQL}
          ${GEO_EXCLUDED_SOURCES_SQL}
          AND visitor_type IN ('crawler', 'ai_referral')
          AND ({{String(visitor, '')}} = '' OR visitor_type = {{String(visitor, '')}})
          AND ((${GEO_CAPTURED_CURRENT_CONDITION}) OR (${GEO_CAPTURED_PREVIOUS_CONDITION}))
          ${GEO_HOST_FILTER_SQL}
        GROUP BY host, path, source, visitor_type
        HAVING visits > 0
        ORDER BY visits DESC, host ASC, path ASC
        LIMIT {{Int32(limit, 20)}}
      `,
    }),
  ],
  output: {
    host: t.string(),
    path: t.string(),
    source: t.string(),
    visitor_type: t.string(),
    visits: t.uint64(),
    previous_visits: t.uint64(),
    last_seen_at: t.dateTime(),
  },
});

export const geoTrafficLog = defineEndpoint("geo_traffic_log", {
  description: "Most recent captured AI visits, newest first",
  params: {
    organization_id: p.string().describe("Organization id"),
    ...GEO_PROJECT_SCOPE_PARAMS,
    ...GEO_EXCLUDED_SOURCES_PARAMS,
    limit: p.int32().optional(50).describe("Max events"),
    visitor_type: p
      .string()
      .optional("")
      .describe(
        "Comma-separated visitor type filter, empty for every AI visitor"
      ),
    category: p
      .string()
      .optional("")
      .describe(
        "Comma-separated request purpose filter, empty for every purpose"
      ),
    ...GEO_HOST_FILTER_PARAMS,
  },
  nodes: [
    node({
      name: "recent",
      sql: `
        SELECT
          captured_at,
          visitor_type,
          source,
          agent,
          category,
          confidence,
          path,
          host,
          country,
          journey_id,
          wants_markdown,
          substring(ua, 1, 180) AS ua_snippet
        FROM geo_traffic_events
        WHERE organization_id = {{String(organization_id)}}
          ${GEO_PROJECT_SCOPE_SQL}
          ${GEO_EXCLUDED_SOURCES_SQL}
          AND (
            ({{String(visitor_type, '')}} = '' AND visitor_type IN ('crawler', 'ai_referral'))
            OR has(splitByChar(',', {{String(visitor_type, '')}}), visitor_type)
          )
          AND (
            {{String(category, '')}} = ''
            OR has(splitByChar(',', {{String(category, '')}}), category)
          )
          AND captured_at >= now() - toIntervalDay(90)
          ${GEO_HOST_FILTER_SQL}
        ORDER BY captured_at DESC
        LIMIT {{Int32(limit, 50)}}
      `,
    }),
  ],
  output: {
    captured_at: t.dateTime(),
    visitor_type: t.string(),
    source: t.string(),
    agent: t.string(),
    category: t.string(),
    confidence: t.string(),
    path: t.string(),
    host: t.string(),
    country: t.string(),
    journey_id: t.string(),
    wants_markdown: t.bool(),
    ua_snippet: t.string(),
  },
});

export const geoTrafficJourneys = defineEndpoint("geo_traffic_journeys", {
  description:
    "AI agent journeys, one row per journey id, newest activity first",
  params: {
    organization_id: p.string().describe("Organization id"),
    ...GEO_PROJECT_SCOPE_PARAMS,
    ...GEO_EXCLUDED_SOURCES_PARAMS,
    ...GEO_WINDOW_PARAMS,
    limit: p.int32().optional(25).describe("Max journeys"),
  },
  nodes: [
    node({
      name: "journey_events",
      sql: `
        SELECT
          journey_id,
          source,
          visitor_type,
          path,
          captured_at
        FROM geo_traffic_events
        WHERE organization_id = {{String(organization_id)}}
          ${GEO_PROJECT_SCOPE_SQL}
          ${GEO_EXCLUDED_SOURCES_SQL}
          ${GEO_CAPTURED_WINDOW_SQL}
          AND visitor_type IN ('crawler', 'ai_referral')
          AND journey_id != ''
      `,
    }),
    node({
      name: "journey_rollup",
      sql: `
        SELECT
          journey_id,
          any(source) AS source,
          any(visitor_type) AS visitor_type,
          count() AS pages,
          uniqExact(path) AS distinct_paths,
          min(captured_at) AS first_seen_at,
          max(captured_at) AS last_seen_at,
          argMin(path, captured_at) AS entry_path,
          arraySlice(groupUniqArray(path), 1, 1000) AS sample_paths
        FROM journey_events
        GROUP BY journey_id
        ORDER BY last_seen_at DESC, journey_id ASC
        LIMIT {{Int32(limit, 25)}}
      `,
    }),
  ],
  output: {
    journey_id: t.string(),
    source: t.string(),
    visitor_type: t.string(),
    pages: t.uint64(),
    distinct_paths: t.uint64(),
    first_seen_at: t.dateTime(),
    last_seen_at: t.dateTime(),
    entry_path: t.string(),
    sample_paths: t.array(t.string()),
  },
});

/**
 * Journey events across the selected window and the one before it. Filters
 * on the sorting key (organization_id, visitor_type, captured_at) so both
 * windows prune by primary key.
 */
const GEO_JOURNEY_COMPARISON_EVENTS_SQL = `
        SELECT
          journey_id,
          source,
          visitor_type,
          if(
            replaceRegexpOne(splitByChar('?', path)[1], '/+$', '') = '',
            '/',
            replaceRegexpOne(splitByChar('?', path)[1], '/+$', '')
          ) AS path,
          captured_at
        FROM geo_traffic_events
        WHERE organization_id = {{String(organization_id)}}
          AND visitor_type IN ('crawler', 'ai_referral')
          ${GEO_PROJECT_SCOPE_SQL}
          ${GEO_EXCLUDED_SOURCES_SQL}
          ${GEO_CAPTURED_COMPARISON_WINDOW_SQL}
          AND journey_id != ''
      `;

export const geoJourneySources = defineEndpoint("geo_journey_sources", {
  description:
    "Exact journey counts per source for the window and the previous window, with a daily series for the current window",
  params: {
    organization_id: p.string().describe("Organization id"),
    ...GEO_PROJECT_SCOPE_PARAMS,
    ...GEO_EXCLUDED_SOURCES_PARAMS,
    ...GEO_WINDOW_PARAMS,
  },
  nodes: [
    node({
      name: "journey_source_events",
      sql: GEO_JOURNEY_COMPARISON_EVENTS_SQL,
    }),
    node({
      name: "journey_source_rollup",
      sql: `
        SELECT
          journey_id,
          any(source) AS source,
          any(visitor_type) AS visitor_type,
          count() AS pages,
          min(captured_at) AS first_seen_at,
          max(captured_at) AS last_seen_at
        FROM journey_source_events
        GROUP BY journey_id
      `,
    }),
    node({
      name: "journey_source_days",
      sql: `
        SELECT
          source,
          visitor_type,
          toDate(first_seen_at) AS day,
          (${GEO_JOURNEY_FIRST_SEEN_CURRENT_CONDITION}) AS is_current,
          count() AS day_journeys,
          sum(pages) AS day_pages,
          countIf(pages <= 1) AS day_single_fetch,
          countIf(pages >= ${GEO_JOURNEY_DEEP_CRAWL_PAGES_SQL}) AS day_deep_crawls,
          max(last_seen_at) AS day_last_seen_at
        FROM journey_source_rollup
        GROUP BY source, visitor_type, day, is_current
      `,
    }),
    node({
      name: "journey_sources",
      sql: `
        SELECT
          source,
          visitor_type,
          sumIf(day_journeys, is_current) AS journeys,
          sumIf(day_journeys, NOT is_current) AS previous_journeys,
          sumIf(day_pages, is_current) AS pages,
          sumIf(day_single_fetch, is_current) AS single_fetch,
          sumIf(day_deep_crawls, is_current) AS deep_crawls,
          maxIf(day_last_seen_at, is_current) AS last_seen_at,
          arrayMap(x -> x.1, arraySort(groupArrayIf((day, day_journeys), is_current))) AS days,
          arrayMap(x -> x.2, arraySort(groupArrayIf((day, day_journeys), is_current))) AS daily_journeys
        FROM journey_source_days
        GROUP BY source, visitor_type
        HAVING journeys > 0 OR previous_journeys > 0
        ORDER BY journeys DESC, source ASC
      `,
    }),
  ],
  output: {
    source: t.string(),
    visitor_type: t.string(),
    journeys: t.uint64(),
    previous_journeys: t.uint64(),
    pages: t.uint64(),
    single_fetch: t.uint64(),
    deep_crawls: t.uint64(),
    last_seen_at: t.dateTime(),
    days: t.array(t.date()),
    daily_journeys: t.array(t.uint64()),
  },
});

export const geoJourneyPages = defineEndpoint("geo_journey_pages", {
  description:
    "Exact journeys per fetched page for the window and the previous window, with entry counts and a daily series",
  params: {
    organization_id: p.string().describe("Organization id"),
    ...GEO_PROJECT_SCOPE_PARAMS,
    ...GEO_EXCLUDED_SOURCES_PARAMS,
    ...GEO_WINDOW_PARAMS,
    limit: p.int32().optional(500).describe("Max pages"),
  },
  nodes: [
    node({
      name: "journey_page_events",
      sql: GEO_JOURNEY_COMPARISON_EVENTS_SQL,
    }),
    node({
      name: "journey_page_rollup",
      sql: `
        SELECT
          journey_id,
          argMin(path, captured_at) AS entry_path,
          groupUniqArray(path) AS paths,
          min(captured_at) AS first_seen_at,
          max(captured_at) AS last_seen_at
        FROM journey_page_events
        GROUP BY journey_id
      `,
    }),
    node({
      name: "journey_page_days",
      sql: `
        SELECT
          arrayJoin(paths) AS page,
          toDate(first_seen_at) AS day,
          (${GEO_JOURNEY_FIRST_SEEN_CURRENT_CONDITION}) AS is_current,
          count() AS day_journeys,
          countIf(entry_path = page) AS day_entries,
          max(last_seen_at) AS day_last_seen_at
        FROM journey_page_rollup
        GROUP BY page, day, is_current
      `,
    }),
    node({
      name: "journey_page_totals",
      sql: `
        SELECT
          page AS path,
          sumIf(day_journeys, is_current) AS journeys,
          sumIf(day_journeys, NOT is_current) AS previous_journeys,
          sumIf(day_entries, is_current) AS entries,
          maxIf(day_last_seen_at, is_current) AS last_seen_at,
          arrayMap(x -> x.1, arraySort(groupArrayIf((day, day_journeys), is_current))) AS days,
          arrayMap(x -> x.2, arraySort(groupArrayIf((day, day_journeys), is_current))) AS daily_journeys
        FROM journey_page_days
        GROUP BY page
      `,
    }),
    node({
      name: "journey_page_counts",
      sql: `
        SELECT
          *,
          countIf(journeys > 0) OVER () AS total_paths,
          countIf(previous_journeys > 0) OVER () AS previous_total_paths
        FROM journey_page_totals
      `,
    }),
    node({
      name: "journey_pages",
      // Previous-window-only pages stay in so the totals on every row survive a
      // window with no journeys at all; they sort last and the caller drops
      // them from the page list.
      sql: `
        SELECT *
        FROM journey_page_counts
        WHERE journeys > 0 OR previous_journeys > 0
        ORDER BY journeys DESC, path ASC
        LIMIT {{Int32(limit, 500)}}
      `,
    }),
  ],
  output: {
    path: t.string(),
    journeys: t.uint64(),
    previous_journeys: t.uint64(),
    entries: t.uint64(),
    last_seen_at: t.dateTime(),
    days: t.array(t.date()),
    daily_journeys: t.array(t.uint64()),
    total_paths: t.uint64(),
    previous_total_paths: t.uint64(),
  },
});

export const geoJourneyDetail = defineEndpoint("geo_journey_detail", {
  description: "Every captured event for a single journey, oldest first",
  params: {
    organization_id: p.string().describe("Organization id"),
    ...GEO_PROJECT_SCOPE_PARAMS,
    ...GEO_EXCLUDED_SOURCES_PARAMS,
    journey_id: p.string().describe("Journey id"),
    ...GEO_WINDOW_PARAMS,
    limit: p.int32().optional(200).describe("Max events"),
  },
  nodes: [
    node({
      name: "journey_detail_events",
      sql: `
        SELECT
          captured_at,
          path,
          host,
          method,
          referer,
          country,
          agent,
          category
        FROM geo_traffic_events
        WHERE organization_id = {{String(organization_id)}}
          ${GEO_PROJECT_SCOPE_SQL}
          ${GEO_EXCLUDED_SOURCES_SQL}
          AND journey_id = {{String(journey_id)}}
          ${GEO_CAPTURED_WINDOW_SQL}
        ORDER BY captured_at ASC
        LIMIT {{Int32(limit, 200)}}
      `,
    }),
  ],
  output: {
    captured_at: t.dateTime(),
    path: t.string(),
    host: t.string(),
    method: t.string(),
    referer: t.string(),
    country: t.string(),
    agent: t.string(),
    category: t.string(),
  },
});
