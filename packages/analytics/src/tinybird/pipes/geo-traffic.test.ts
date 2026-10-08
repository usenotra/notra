import { expect, test } from "bun:test";
import { DatabaseSync } from "node:sqlite";

import { geoTrafficOverview } from "./geo-traffic";

test.each(["", "fixture.example"])(
  "overview SQL keeps previous-only source rows with host filter %j",
  (host) => {
    const result = geoTrafficOverview.options.nodes.find(
      (node) => node._name === "result"
    );
    expect(result).toBeDefined();
    if (!result) {
      throw new Error("Overview result node is missing");
    }
    expect(result.sql).not.toMatch(/\bLIMIT\b/i);
    const database = new DatabaseSync(":memory:");
    try {
      database.exec(`
        CREATE TABLE per_source (source TEXT, visitor_type TEXT, visits INTEGER, previous_visits INTEGER);
        CREATE TABLE per_source_hosts (source TEXT, visitor_type TEXT, visits INTEGER, previous_visits INTEGER);
      `);
      const insert = database.prepare(
        `INSERT INTO ${host ? "per_source_hosts" : "per_source"} VALUES (?, ?, ?, ?)`
      );
      insert.run("GPTBot", "crawler", 0, 7);
      insert.run("ChatGPT-User", "crawler", 0, 2);
      insert.run("openai", "ai_referral", 0, 4);
      insert.run("PerplexityBot", "crawler", 3, 1);
      insert.run("inactive", "crawler", 0, 0);
      for (let index = 0; index < 120; index += 1) {
        insert.run(`previous-source-${index}`, "crawler", 0, 1);
      }
      const rows = database
        .prepare(
          result.sql.replaceAll(
            "{{String(hosts, '')}}",
            host ? "'fixture.example'" : "''"
          )
        )
        .all();
      expect(rows).toHaveLength(124);
      expect(rows.find((row) => row.source === "GPTBot")).toMatchObject({
        visits: 0,
        previous_visits: 7,
      });
      expect(rows.some((row) => row.source === "inactive")).toBe(false);
      expect(
        rows.reduce((total, row) => total + Number(row.previous_visits), 0)
      ).toBe(134);
      expect(rows.reduce((total, row) => total + Number(row.visits), 0)).toBe(
        3
      );
    } finally {
      database.close();
    }
  }
);
