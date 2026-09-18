import "./utils/infrastructure";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

import { geoMentionChecks, geoScans } from "@notra/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

const unnestedCompetitorBrand = sql`unnest(${geoMentionChecks.competitors}) as brand`;
const competitorBrand = sql<string>`brand`;

function mentionCheck(values: {
  id: string;
  organizationId: string;
  projectId: string;
  scanId: string;
  competitors: string[];
  capturedAt: Date;
}) {
  return {
    ...values,
    engine: "engine",
    promptId: values.id,
    prompt: values.id,
    answer: values.id,
    mentioned: false,
  };
}

describe("competitor share aggregates", () => {
  test("unnests brands and skips empty competitor arrays", async () => {
    const scope = await seedProject("share");
    await testDb.insert(geoScans).values({ id: "scan-share", ...scope });
    const day1 = new Date("2026-03-01T12:00:00.000Z");
    const day2 = new Date("2026-03-02T12:00:00.000Z");
    await testDb.insert(geoMentionChecks).values([
      mentionCheck({
        id: "a",
        ...scope,
        scanId: "scan-share",
        competitors: ["Acme", "Globex"],
        capturedAt: day1,
      }),
      mentionCheck({
        id: "b",
        ...scope,
        scanId: "scan-share",
        competitors: ["Acme"],
        capturedAt: day1,
      }),
      mentionCheck({
        id: "c",
        ...scope,
        scanId: "scan-share",
        competitors: ["Acme"],
        capturedAt: day2,
      }),
      mentionCheck({
        id: "empty",
        ...scope,
        scanId: "scan-share",
        competitors: [],
        capturedAt: day1,
      }),
    ]);

    const filters = and(
      eq(geoMentionChecks.organizationId, scope.organizationId),
      eq(geoMentionChecks.projectId, scope.projectId),
      isNull(geoMentionChecks.personaId)
    );
    expect(
      await testDb
        .select({
          brand: competitorBrand,
          mentions: sql<number>`count(*)::int`,
        })
        .from(geoMentionChecks)
        .crossJoinLateral(unnestedCompetitorBrand)
        .where(filters)
        .groupBy(competitorBrand)
        .orderBy(sql`count(*) desc`)
        .limit(10)
    ).toEqual([
      { brand: "Acme", mentions: 3 },
      { brand: "Globex", mentions: 1 },
    ]);

    const day = sql<string>`(${geoMentionChecks.capturedAt})::date`;
    const timeseries = await testDb
      .select({
        brand: competitorBrand,
        day,
        mentions: sql<number>`count(*)::int`,
      })
      .from(geoMentionChecks)
      .crossJoinLateral(unnestedCompetitorBrand)
      .where(filters)
      .groupBy(competitorBrand, day)
      .orderBy(day);
    expect(
      timeseries
        .map((row) => ({
          brand: row.brand,
          day: String(row.day).slice(0, 10),
          mentions: Number(row.mentions),
        }))
        .toSorted(
          (left, right) =>
            left.day.localeCompare(right.day) ||
            left.brand.localeCompare(right.brand)
        )
    ).toEqual([
      { brand: "Acme", day: "2026-03-01", mentions: 2 },
      { brand: "Globex", day: "2026-03-01", mentions: 1 },
      { brand: "Acme", day: "2026-03-02", mentions: 1 },
    ]);
  });
});
