import { expect, test } from "bun:test";
import { DatabaseSync } from "node:sqlite";

import {
  GEO_PROJECT_SCOPE_SQL,
  GEO_SITE_SCOPE_SQL,
} from "../../constants/geo-queries";
import {
  geoTrafficDaily,
  geoTrafficEvents,
  geoTrafficPagesByHostDaily,
  webAudienceDaily,
  webPagesDaily,
  webSourcesDaily,
} from "../datasources";
import {
  geoTrafficDailyMv,
  geoTrafficOverview,
  geoTrafficPages,
  geoTrafficPagesByHostDailyMv,
  geoTrafficTimeseries,
} from "./geo-traffic";
import { webAudienceDailyMv, webPagesDailyMv, webSourcesDailyMv } from "./web";

test.each([
  [geoTrafficDaily, geoTrafficDailyMv],
  [geoTrafficPagesByHostDaily, geoTrafficPagesByHostDailyMv],
  [webPagesDaily, webPagesDailyMv],
  [webSourcesDaily, webSourcesDailyMv],
  [webAudienceDaily, webAudienceDailyMv],
])(
  "%s retains every materialized grouping dimension in its merge key",
  (datasource, mv) => {
    const sql = mv.options.nodes[0]?.sql ?? "";
    const group = sql
      .split("GROUP BY")[1]
      ?.trim()
      .split(",")
      .map((value) => value.trim());
    expect(group).toBeDefined();
    const engine = datasource.options.engine;
    if (
      engine?.type !== "AggregatingMergeTree" ||
      typeof engine.sortingKey === "string"
    ) {
      throw new Error("Expected an aggregate merge engine");
    }
    expect(new Set(engine.sortingKey)).toEqual(new Set(group));
  }
);

test("legacy AI rows default to explicitly unassigned site identity", () => {
  for (const datasource of [
    geoTrafficEvents,
    geoTrafficDaily,
    geoTrafficPagesByHostDaily,
  ]) {
    expect(datasource.options.schema.site_id._modifiers.defaultValue).toBe("");
  }
});

test("campaign and OS tuples survive merge-key aggregation without losing counts", () => {
  const sourcesEngine = webSourcesDaily.options.engine;
  const audienceEngine = webAudienceDaily.options.engine;
  if (
    sourcesEngine?.type !== "AggregatingMergeTree" ||
    audienceEngine?.type !== "AggregatingMergeTree" ||
    typeof sourcesEngine.sortingKey === "string" ||
    typeof audienceEngine.sortingKey === "string"
  ) {
    throw new Error("Expected aggregate merge engines");
  }
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(`
      CREATE TABLE campaigns (organization_id TEXT, project_id TEXT, site_id TEXT, host TEXT,
        day TEXT, referrer_group TEXT, referrer_source TEXT, ai_product TEXT,
        utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, sessions INTEGER);
      INSERT INTO campaigns VALUES
        ('org','project','site','shared.example','2026-10-08','ai','openai','chatgpt','launch','email','a',2),
        ('org','project','site','shared.example','2026-10-08','ai','openai','chatgpt','launch','email','b',3),
        ('org','project','site','shared.example','2026-10-08','ai','openai','chatgpt','launch','social','b',4);
      CREATE TABLE audience (organization_id TEXT, project_id TEXT, site_id TEXT, host TEXT,
        day TEXT, country TEXT, device TEXT, browser TEXT, os TEXT, views INTEGER);
      INSERT INTO audience VALUES
        ('org','project','site','shared.example','2026-10-08','DE','desktop','Chrome','macOS',2),
        ('org','project','site','shared.example','2026-10-08','DE','desktop','Chrome','Windows',3);
    `);
    const campaigns = database
      .prepare(`SELECT utm_medium, utm_campaign, sum(sessions) AS sessions
      FROM campaigns GROUP BY ${sourcesEngine.sortingKey.join(",")}`)
      .all();
    expect(campaigns).toEqual([
      { utm_medium: "email", utm_campaign: "a", sessions: 2 },
      { utm_medium: "email", utm_campaign: "b", sessions: 3 },
      { utm_medium: "social", utm_campaign: "b", sessions: 4 },
    ]);
    expect(
      database
        .prepare(`SELECT os, sum(views) AS views FROM audience
      GROUP BY ${audienceEngine.sortingKey.join(",")}`)
        .all()
    ).toEqual([
      { os: "Windows", views: 3 },
      { os: "macOS", views: 2 },
    ]);
  } finally {
    database.close();
  }
});

test("AI site predicates isolate sibling mounts and retain old-origin facts", () => {
  for (const endpoint of [
    geoTrafficOverview,
    geoTrafficTimeseries,
    geoTrafficPages,
  ]) {
    for (const query of endpoint.options.nodes.filter((node) =>
      node.sql.includes("WHERE organization_id")
    )) {
      expect(query.sql).toContain(GEO_SITE_SCOPE_SQL);
    }
    expect(endpoint.options.params?.site_id).toBeDefined();
  }
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(`
      CREATE TABLE facts (organization_id TEXT, project_id TEXT, site_id TEXT, host TEXT, path TEXT, visits INTEGER);
      INSERT INTO facts VALUES
        ('org','project','site-a','shared.example','/blog/a',2),
        ('org','project','site-b','shared.example','/docs/b',3),
        ('org','project','site-a','changed.example','/blog/c',4),
        ('org','project','','shared.example','/legacy',5),
        ('org','other-project','','shared.example','/other',7),
        ('org','','','shared.example','/unassigned',9);
    `);
    const predicate = GEO_SITE_SCOPE_SQL.replaceAll(
      "{{String(site_id, '')}}",
      "?"
    );
    const query = database.prepare(
      `SELECT sum(visits) AS visits FROM facts WHERE organization_id = 'org' ${predicate}`
    );
    expect(query.get("site-a", "site-a")).toEqual({ visits: 6 });
    expect(query.get("site-b", "site-b")).toEqual({ visits: 3 });
    expect(query.get("", "")).toEqual({ visits: 30 });
    const projectPredicate = GEO_PROJECT_SCOPE_SQL.replaceAll(
      "{{String(project_id, '')}}",
      "$project"
    ).replaceAll("{{Int32(include_unassigned, 0)}}", "$unassigned");
    const projectQuery = database.prepare(
      `SELECT sum(visits) AS visits FROM facts WHERE organization_id = 'org' ${projectPredicate}`
    );
    expect(projectQuery.get({ project: "project", unassigned: 0 })).toEqual({
      visits: 14,
    });
    expect(projectQuery.get({ project: "project", unassigned: 1 })).toEqual({
      visits: 23,
    });
  } finally {
    database.close();
  }
});
