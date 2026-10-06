import {
  defineEndpoint,
  defineMaterializedView,
  node,
  p,
  t,
} from "@tinybirdco/sdk";

import {
  GEO_CAPTURED_WINDOW_SQL,
  GEO_DAY_COMPARISON_WINDOW_SQL,
  GEO_DAY_CURRENT_CONDITION,
  GEO_DAY_PREVIOUS_CONDITION,
  GEO_DAY_WINDOW_SQL,
  GEO_PROJECT_SCOPE_PARAMS,
  GEO_PROJECT_SCOPE_SQL,
  GEO_WINDOW_PARAMS,
} from "../../constants/geo-queries";
import { WEB_SCOPE_PARAMS, WEB_SCOPE_SQL } from "../../constants/web-queries";
import {
  webAudienceDaily,
  webPagesDaily,
  webSourcesDaily,
} from "../datasources";

const LANDING = "session_page_index <= 1";

export const webPagesDailyMv = defineMaterializedView("web_pages_daily_mv", {
  description: "Rolls web_page_views into web_pages_daily on every ingest",
  datasource: webPagesDaily,
  nodes: [
    node({
      name: "pages_daily",
      sql: `
        SELECT
          toDate(captured_at) AS day,
          organization_id,
          project_id,
          site_id,
          host,
          path,
          status,
          countState() AS views_state,
          uniqState(visitor_id) AS visitors_state,
          countIfState(toUInt8(${LANDING})) AS sessions_state,
          countIfState(toUInt8(session_page_index = 2)) AS engaged_sessions_state,
          uniqIfState(visitor_id, toUInt8(referrer_group = 'ai')) AS ai_visitors_state
        FROM web_page_views
        GROUP BY day, organization_id, project_id, site_id, host, path, status
      `,
    }),
  ],
});

export const webSourcesDailyMv = defineMaterializedView(
  "web_sources_daily_mv",
  {
    description:
      "Rolls the first page of every session in web_page_views into web_sources_daily",
    datasource: webSourcesDaily,
    nodes: [
      node({
        name: "sources_daily",
        sql: `
          SELECT
            toDate(captured_at) AS day,
            organization_id,
            project_id,
            site_id,
            host,
            referrer_group,
            referrer_source,
            ai_product,
            utm_source,
            utm_medium,
            utm_campaign,
            countState() AS sessions_state,
            uniqState(visitor_id) AS visitors_state
          FROM web_page_views
          WHERE ${LANDING} AND status < 400
          GROUP BY day, organization_id, project_id, site_id, host,
            referrer_group, referrer_source, ai_product,
            utm_source, utm_medium, utm_campaign
        `,
      }),
    ],
  }
);

export const webAudienceDailyMv = defineMaterializedView(
  "web_audience_daily_mv",
  {
    description: "Rolls web_page_views into web_audience_daily on every ingest",
    datasource: webAudienceDaily,
    nodes: [
      node({
        name: "audience_daily",
        sql: `
          SELECT
            toDate(captured_at) AS day,
            organization_id,
            project_id,
            site_id,
            host,
            country,
            device,
            browser,
            os,
            countState() AS views_state,
            uniqState(visitor_id) AS visitors_state
          FROM web_page_views
          WHERE status < 400
          GROUP BY day, organization_id, project_id, site_id, host,
            country, device, browser, os
        `,
      }),
    ],
  }
);

const WEB_PARAMS = {
  organization_id: p.string().describe("Organization id"),
  ...GEO_PROJECT_SCOPE_PARAMS,
  ...WEB_SCOPE_PARAMS,
  ...GEO_WINDOW_PARAMS,
};

const WEB_PAGES_WHERE = `WHERE organization_id = {{String(organization_id)}}
          ${GEO_PROJECT_SCOPE_SQL}
          ${WEB_SCOPE_SQL}`;

export const webOverview = defineEndpoint("web_overview", {
  description:
    "Views, visitors, sessions and engaged sessions for the window and the window before it",
  params: WEB_PARAMS,
  nodes: [
    node({
      name: "overview",
      sql: `
        SELECT
          countMergeIf(views_state, (${GEO_DAY_CURRENT_CONDITION})) AS views,
          countMergeIf(views_state, (${GEO_DAY_PREVIOUS_CONDITION})) AS previous_views,
          uniqMergeIf(visitors_state, (${GEO_DAY_CURRENT_CONDITION})) AS visitors,
          uniqMergeIf(visitors_state, (${GEO_DAY_PREVIOUS_CONDITION})) AS previous_visitors,
          countIfMergeIf(sessions_state, (${GEO_DAY_CURRENT_CONDITION})) AS sessions,
          countIfMergeIf(sessions_state, (${GEO_DAY_PREVIOUS_CONDITION})) AS previous_sessions,
          countIfMergeIf(engaged_sessions_state, (${GEO_DAY_CURRENT_CONDITION})) AS engaged_sessions,
          uniqIfMergeIf(ai_visitors_state, (${GEO_DAY_CURRENT_CONDITION})) AS ai_visitors,
          uniqIfMergeIf(ai_visitors_state, (${GEO_DAY_PREVIOUS_CONDITION})) AS previous_ai_visitors
        FROM web_pages_daily
        ${WEB_PAGES_WHERE}
          AND status < 400
          ${GEO_DAY_COMPARISON_WINDOW_SQL}
      `,
    }),
  ],
  output: {
    views: t.uint64(),
    previous_views: t.uint64(),
    visitors: t.uint64(),
    previous_visitors: t.uint64(),
    sessions: t.uint64(),
    previous_sessions: t.uint64(),
    engaged_sessions: t.uint64(),
    ai_visitors: t.uint64(),
    previous_ai_visitors: t.uint64(),
  },
});

export const webTimeseries = defineEndpoint("web_timeseries", {
  description: "Daily human views and visitors",
  params: WEB_PARAMS,
  nodes: [
    node({
      name: "daily",
      sql: `
        SELECT
          day,
          countMerge(views_state) AS views,
          uniqMerge(visitors_state) AS visitors
        FROM web_pages_daily
        ${WEB_PAGES_WHERE}
          AND status < 400
          ${GEO_DAY_WINDOW_SQL}
        GROUP BY day
        ORDER BY day ASC
      `,
    }),
  ],
  output: {
    day: t.date(),
    views: t.uint64(),
    visitors: t.uint64(),
  },
});

export const webPages = defineEndpoint("web_pages", {
  description:
    "Top pages by human views, with visitors, sessions that started there and AI-referred visitors; status 404 lists missing pages",
  params: {
    ...WEB_PARAMS,
    not_found: p
      .int32()
      .optional(0)
      .describe("Set to 1 to list pages that answered 404"),
    limit: p.int32().optional(20).describe("Max rows"),
  },
  nodes: [
    node({
      name: "top_pages",
      sql: `
        SELECT
          host,
          path,
          countMergeIf(views_state, (${GEO_DAY_CURRENT_CONDITION})) AS views,
          countMergeIf(views_state, (${GEO_DAY_PREVIOUS_CONDITION})) AS previous_views,
          uniqMergeIf(visitors_state, (${GEO_DAY_CURRENT_CONDITION})) AS visitors,
          countIfMergeIf(sessions_state, (${GEO_DAY_CURRENT_CONDITION})) AS landings,
          uniqIfMergeIf(ai_visitors_state, (${GEO_DAY_CURRENT_CONDITION})) AS ai_visitors
        FROM web_pages_daily
        ${WEB_PAGES_WHERE}
          AND if({{Int32(not_found, 0)}} = 1, status = 404, status < 400)
          ${GEO_DAY_COMPARISON_WINDOW_SQL}
        GROUP BY host, path
        HAVING views > 0
        ORDER BY views DESC, host ASC, path ASC
        LIMIT {{Int32(limit, 20)}}
      `,
    }),
  ],
  output: {
    host: t.string(),
    path: t.string(),
    views: t.uint64(),
    previous_views: t.uint64(),
    visitors: t.uint64(),
    landings: t.uint64(),
    ai_visitors: t.uint64(),
  },
});

export const webSources = defineEndpoint("web_sources", {
  description:
    "Where sessions came from: referrer group and source (AI products included), counted on each session's first page",
  params: {
    ...WEB_PARAMS,
    limit: p.int32().optional(20).describe("Max rows"),
  },
  nodes: [
    node({
      name: "sources",
      sql: `
        SELECT
          referrer_group,
          referrer_source,
          any(ai_product) AS ai_product,
          countMergeIf(sessions_state, (${GEO_DAY_CURRENT_CONDITION})) AS sessions,
          countMergeIf(sessions_state, (${GEO_DAY_PREVIOUS_CONDITION})) AS previous_sessions,
          uniqMergeIf(visitors_state, (${GEO_DAY_CURRENT_CONDITION})) AS visitors
        FROM web_sources_daily
        ${WEB_PAGES_WHERE}
          AND referrer_group != 'internal'
          ${GEO_DAY_COMPARISON_WINDOW_SQL}
        GROUP BY referrer_group, referrer_source
        HAVING sessions > 0
        ORDER BY sessions DESC, referrer_source ASC
        LIMIT {{Int32(limit, 20)}}
      `,
    }),
  ],
  output: {
    referrer_group: t.string(),
    referrer_source: t.string(),
    ai_product: t.string(),
    sessions: t.uint64(),
    previous_sessions: t.uint64(),
    visitors: t.uint64(),
  },
});

export const webCampaigns = defineEndpoint("web_campaigns", {
  description: "Sessions per UTM source, medium and campaign",
  params: {
    ...WEB_PARAMS,
    limit: p.int32().optional(20).describe("Max rows"),
  },
  nodes: [
    node({
      name: "campaigns",
      sql: `
        SELECT
          utm_source,
          utm_medium,
          utm_campaign,
          countMerge(sessions_state) AS sessions,
          uniqMerge(visitors_state) AS visitors
        FROM web_sources_daily
        ${WEB_PAGES_WHERE}
          AND utm_source != ''
          ${GEO_DAY_WINDOW_SQL}
        GROUP BY utm_source, utm_medium, utm_campaign
        ORDER BY sessions DESC, utm_source ASC
        LIMIT {{Int32(limit, 20)}}
      `,
    }),
  ],
  output: {
    utm_source: t.string(),
    utm_medium: t.string(),
    utm_campaign: t.string(),
    sessions: t.uint64(),
    visitors: t.uint64(),
  },
});

export const webAudience = defineEndpoint("web_audience", {
  description: "Visitors per country, device, browser or OS",
  params: {
    ...WEB_PARAMS,
    dimension: p
      .string()
      .optional("country")
      .describe("country, device, browser or os"),
    limit: p.int32().optional(10).describe("Max rows"),
  },
  nodes: [
    node({
      name: "audience",
      sql: `
        SELECT
          multiIf(
            {{String(dimension, 'country')}} = 'device', device,
            {{String(dimension, 'country')}} = 'browser', browser,
            {{String(dimension, 'country')}} = 'os', os,
            country
          ) AS value,
          uniqMerge(visitors_state) AS visitors,
          countMerge(views_state) AS views
        FROM web_audience_daily
        ${WEB_PAGES_WHERE}
          ${GEO_DAY_WINDOW_SQL}
        GROUP BY value
        ORDER BY visitors DESC, value ASC
        LIMIT {{Int32(limit, 10)}}
      `,
    }),
  ],
  output: {
    value: t.string(),
    visitors: t.uint64(),
    views: t.uint64(),
  },
});

export const webHosts = defineEndpoint("web_hosts", {
  description:
    "Hosts and sites with human views in the window, for the domain selector",
  params: WEB_PARAMS,
  nodes: [
    node({
      name: "hosts",
      sql: `
        SELECT
          host,
          site_id,
          countMerge(views_state) AS views
        FROM web_pages_daily
        ${WEB_PAGES_WHERE}
          ${GEO_DAY_WINDOW_SQL}
        GROUP BY host, site_id
        ORDER BY views DESC, host ASC
      `,
    }),
  ],
  output: {
    host: t.string(),
    site_id: t.string(),
    views: t.uint64(),
  },
});

export const webAiOutcomes = defineEndpoint("web_ai_outcomes", {
  description:
    "Pages per session and the share of sessions that read two or more pages, per AI source and for all sessions",
  params: WEB_PARAMS,
  nodes: [
    node({
      name: "outcome_sessions",
      sql: `
        SELECT
          session_id,
          anyIf(referrer_group, ${LANDING}) AS landing_group,
          anyIf(referrer_source, ${LANDING}) AS landing_source,
          count() AS pages
        FROM web_page_views
        WHERE organization_id = {{String(organization_id)}}
          ${GEO_PROJECT_SCOPE_SQL}
          ${WEB_SCOPE_SQL}
          AND session_id != ''
          AND status < 400
          ${GEO_CAPTURED_WINDOW_SQL}
        GROUP BY session_id
      `,
    }),
    node({
      name: "outcomes",
      sql: `
        SELECT
          landing_source AS source,
          count() AS sessions,
          avg(pages) AS pages_per_session,
          countIf(pages >= 2) / count() AS engaged_rate
        FROM outcome_sessions
        WHERE landing_group = 'ai'
        GROUP BY landing_source
        UNION ALL
        SELECT
          '' AS source,
          count() AS sessions,
          avg(pages) AS pages_per_session,
          countIf(pages >= 2) / greatest(count(), 1) AS engaged_rate
        FROM outcome_sessions
      `,
    }),
  ],
  output: {
    source: t.string(),
    sessions: t.uint64(),
    pages_per_session: t.float64(),
    engaged_rate: t.float64(),
  },
});
