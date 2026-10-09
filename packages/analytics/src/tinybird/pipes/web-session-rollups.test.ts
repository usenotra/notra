import { expect, test } from "bun:test";
import { DatabaseSync } from "node:sqlite";

import {
  GEO_DAY_CURRENT_CONDITION,
  GEO_DAY_PREVIOUS_CONDITION,
} from "../../constants/geo-queries";
import {
  webAiOutcomes,
  webOverview,
  webPagesDailyMv,
  webSourcesDailyMv,
} from "./web";

test("404 then two successful views agree across session rollups and raw outcomes", () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(`
      CREATE TABLE web_page_views (captured_at TEXT, organization_id TEXT, project_id TEXT, site_id TEXT,
        host TEXT, path TEXT, status INTEGER, visitor_id TEXT, session_id TEXT, session_page_index INTEGER,
        referrer_group TEXT, referrer_source TEXT, ai_product TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT);
      INSERT INTO web_page_views VALUES
        ('2026-10-08','org','project','site','example.com','/missing',404,'visitor','',0,'ai','openai','chatgpt','','',''),
        ('2026-10-08','org','project','site','example.com','/',200,'visitor','session',1,'ai','openai','chatgpt','','',''),
        ('2026-10-08','org','project','site','example.com','/pricing',200,'visitor','session',2,'internal','','','','','');
    `);
    for (const [name, mv] of [
      ["web_pages_daily", webPagesDailyMv],
      ["web_sources_daily", webSourcesDailyMv],
    ] as const) {
      const sql = (mv.options.nodes[0]?.sql ?? "")
        .replaceAll("toDate(captured_at)", "captured_at")
        .replaceAll("countState()", "count(*)")
        .replaceAll("uniqState(visitor_id)", "count(DISTINCT visitor_id)")
        .replace(
          /countIfState\(toUInt8\((.*?)\)\)/g,
          "sum(CASE WHEN $1 THEN 1 ELSE 0 END)"
        )
        .replace(
          "uniqIfState(visitor_id, toUInt8(referrer_group = 'ai'))",
          "count(DISTINCT CASE WHEN referrer_group = 'ai' THEN visitor_id END)"
        );
      database.exec(`CREATE TABLE ${name} AS ${sql}`);
    }
    const overview = (webOverview.options.nodes[0]?.sql ?? "")
      .split("WHERE organization_id")[0]
      ?.replaceAll(GEO_DAY_CURRENT_CONDITION, "1")
      .replaceAll(GEO_DAY_PREVIOUS_CONDITION, "0")
      .replace(
        /(?:countMergeIf|countIfMergeIf|uniqMergeIf|uniqIfMergeIf)\((\w+), \((\d)\)\)/g,
        "sum(CASE WHEN $2 THEN $1 ELSE 0 END)"
      );
    expect(
      database.prepare(`${overview} WHERE status < 400`).get()
    ).toMatchObject({
      views: 2,
      sessions: 1,
      engaged_sessions: 1,
    });
    expect(
      database
        .prepare(
          "SELECT referrer_source, sum(sessions_state) AS sessions FROM web_sources_daily GROUP BY referrer_source"
        )
        .all()
    ).toEqual([{ referrer_source: "openai", sessions: 1 }]);
    expect(
      database
        .prepare(
          "SELECT sum(views_state) AS missing_views, sum(sessions_state) AS sessions FROM web_pages_daily WHERE status = 404"
        )
        .get()
    ).toEqual({ missing_views: 1, sessions: 0 });
    const outcomes = (webAiOutcomes.options.nodes[0]?.sql ?? "")
      .split("WHERE organization_id")[0]
      ?.replace(
        /anyIf\((\w+), session_page_index <= 1\)/g,
        "max(CASE WHEN session_page_index <= 1 THEN $1 END)"
      );
    expect(
      database
        .prepare(
          `${outcomes} WHERE session_id != '' AND status < 400 GROUP BY session_id`
        )
        .all()
    ).toEqual([
      {
        session_id: "session",
        landing_group: "ai",
        landing_source: "openai",
        pages: 2,
      },
    ]);
    database.exec(
      `CREATE TABLE outcome_sessions AS ${outcomes} WHERE session_id != '' AND status < 400 GROUP BY session_id`
    );
    const outcomeTotals = (webAiOutcomes.options.nodes[1]?.sql ?? "")
      .replaceAll("count()", "count(*)")
      .replaceAll(
        "countIf(pages >= 2)",
        "sum(CASE WHEN pages >= 2 THEN 1 ELSE 0 END)"
      )
      .replaceAll("greatest(count(*), 1)", "max(count(*), 1)");
    expect(database.prepare(outcomeTotals).all()).toEqual([
      { source: "openai", sessions: 1, pages_per_session: 2, engaged_rate: 1 },
      { source: "", sessions: 1, pages_per_session: 2, engaged_rate: 1 },
    ]);
  } finally {
    database.close();
  }
});
