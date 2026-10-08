import { expect, test } from "bun:test";
import { DatabaseSync } from "node:sqlite";

import {
  GEO_DAY_COMPARISON_WINDOW_SQL,
  GEO_DAY_CURRENT_CONDITION,
  GEO_DAY_PREVIOUS_CONDITION,
} from "../../constants/geo-queries";
import { webAudience } from "./web";

test.each(["country", "device"])(
  "audience %s compares distinct visitors in the same scope",
  (dimension) => {
    const node = webAudience.options.nodes[0];
    if (!node) {
      throw new Error("Audience node is missing");
    }
    const current = "day BETWEEN '2026-10-01' AND '2026-10-07'";
    const previous = "day BETWEEN '2026-09-24' AND '2026-09-30'";
    const scope = node.sql.slice(
      node.sql.indexOf("WHERE organization_id"),
      node.sql.indexOf(GEO_DAY_COMPARISON_WINDOW_SQL)
    );
    const sql = node.sql
      .replaceAll(
        `uniqMergeIf(visitors_state, (${GEO_DAY_CURRENT_CONDITION}))`,
        `COUNT(DISTINCT CASE WHEN ${current} THEN visitors_state END)`
      )
      .replaceAll(
        `uniqMergeIf(visitors_state, (${GEO_DAY_PREVIOUS_CONDITION}))`,
        `COUNT(DISTINCT CASE WHEN ${previous} THEN visitors_state END)`
      )
      .replaceAll(
        `countMergeIf(views_state, (${GEO_DAY_CURRENT_CONDITION}))`,
        `SUM(CASE WHEN ${current} THEN views_state ELSE 0 END)`
      )
      .replaceAll(
        scope,
        "WHERE organization_id = 'org' AND project_id = 'project' AND site_id = 'site' AND host = 'selected.example' "
      )
      .replaceAll(
        GEO_DAY_COMPARISON_WINDOW_SQL,
        `AND ((${current}) OR (${previous}))`
      )
      .replaceAll("{{String(dimension, 'country')}}", `'${dimension}'`)
      .replaceAll("{{Int32(limit, 10)}}", "10");
    const db = new DatabaseSync(":memory:");
    try {
      db.function("multiIf", { varargs: true }, (...values) => {
        for (let index = 0; index < values.length - 1; index += 2) {
          if (values[index]) {
            return values[index + 1] ?? null;
          }
        }
        return values.at(-1) ?? null;
      });
      db.exec(
        "CREATE TABLE web_audience_daily (day TEXT, organization_id TEXT, project_id TEXT, site_id TEXT, host TEXT, country TEXT, device TEXT, browser TEXT, os TEXT, visitors_state TEXT, views_state INTEGER)"
      );
      const add = db.prepare(
        "INSERT INTO web_audience_daily VALUES (?, ?, 'project', 'site', ?, ?, ?, '', '', ?, 1)"
      );
      add.run(
        "2026-10-01",
        "org",
        "selected.example",
        "DE",
        "desktop",
        "current-a"
      );
      add.run(
        "2026-10-02",
        "org",
        "selected.example",
        "DE",
        "desktop",
        "current-a"
      );
      add.run(
        "2026-10-07",
        "org",
        "selected.example",
        "DE",
        "desktop",
        "current-b"
      );
      add.run(
        "2026-09-24",
        "org",
        "selected.example",
        "DE",
        "desktop",
        "old-a"
      );
      add.run(
        "2026-09-30",
        "org",
        "selected.example",
        "DE",
        "desktop",
        "old-a"
      );
      add.run(
        "2026-09-29",
        "org",
        "selected.example",
        "FR",
        "tablet",
        "previous-only"
      );
      add.run(
        "2026-10-02",
        "other-org",
        "selected.example",
        "DE",
        "desktop",
        "foreign-org"
      );
      add.run(
        "2026-10-02",
        "org",
        "other.example",
        "DE",
        "desktop",
        "foreign-host"
      );
      add.run(
        "2026-09-23",
        "org",
        "selected.example",
        "DE",
        "desktop",
        "outside-window"
      );
      expect(db.prepare(sql).all()).toEqual([
        expect.objectContaining({
          value: dimension === "country" ? "DE" : "desktop",
          visitors: 2,
          previous_visitors: 1,
          views: 3,
        }),
      ]);
    } finally {
      db.close();
    }
  }
);
