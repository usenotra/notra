import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { geoScans } from "@notra/db/schema";
import { drizzle } from "drizzle-orm/pglite";

import { geoScanPlanSummarySelection } from "../src/utils/geo-scan-plan-summary";

const client = new PGlite();
const testDb = drizzle(client);
const relationalDb = drizzle(client, { schema: { geoScans } });

beforeAll(async () => {
  await client.exec(`
    create table geo_scans (
      id text primary key,
      plan jsonb,
      plan_summary jsonb
    )
  `);
});

afterAll(async () => {
  await client.close();
});

describe("GEO scan plan summary projection", () => {
  test("returns a persisted summary without expanding the plan", async () => {
    const planSummary = {
      plannedChecks: 2,
      hasTasks: true,
      engines: ["alpha"],
      taskCounts: [{ engine: "alpha", plannedChecks: 2, failedChecks: 1 }],
    };
    await client.query(
      "insert into geo_scans (id, plan, plan_summary) values ($1, $2, $3)",
      [
        "persisted",
        JSON.stringify({ tasks: "invalid" }),
        JSON.stringify(planSummary),
      ]
    );

    const [row] = await relationalDb.query.geoScans.findMany({
      columns: { id: true },
      extras: { planSummary: geoScanPlanSummarySelection() },
      where: (table, { eq }) => eq(table.id, "persisted"),
    });

    expect(row?.planSummary).toEqual(planSummary);
  });

  test("aggregates compact per-engine counts without returning task payloads", async () => {
    await client.query("insert into geo_scans (id, plan) values ($1, $2)", [
      "scan-1",
      JSON.stringify({
        totalChecks: 3,
        engines: ["zeta", "alpha"],
        tasks: [
          { key: "a", engine: "alpha", prompt: "private prompt one" },
          { key: "b", engine: "zeta", prompt: "private prompt two" },
          { key: "c", engine: "zeta", prompt: "private prompt three" },
        ],
        taskStates: { c: "failed" },
      }),
    ]);

    const [row] = await relationalDb.query.geoScans.findMany({
      columns: { id: true },
      extras: { planSummary: geoScanPlanSummarySelection() },
      where: (table, { eq }) => eq(table.id, "scan-1"),
    });

    expect(row?.planSummary).toEqual({
      plannedChecks: 3,
      hasTasks: true,
      engines: ["zeta", "alpha"],
      taskCounts: [
        { engine: "alpha", plannedChecks: 1, failedChecks: 0 },
        { engine: "zeta", plannedChecks: 2, failedChecks: 1 },
      ],
    });
    expect(JSON.stringify(row)).not.toContain("private prompt");
  });

  test("keeps legacy scans nullable", async () => {
    await client.query("insert into geo_scans (id, plan) values ($1, null)", [
      "legacy",
    ]);

    const rows = await testDb
      .select({ id: geoScans.id, planSummary: geoScanPlanSummarySelection() })
      .from(geoScans);

    expect(rows.find((row) => row.id === "legacy")?.planSummary).toBeNull();
  });
});
