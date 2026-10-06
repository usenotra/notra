import "./utils/infrastructure";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

import {
  geoMentionChecks,
  geoPersonas,
  geoScans,
  geoSettings,
} from "@notra/db/schema";
import { eq } from "drizzle-orm";

import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";

const {
  queryGeoCheckCompetitorShare,
  queryGeoCheckCompetitorTimeseries,
  queryGeoCheckEngineTotals,
  queryGeoCheckLanguageShare,
  queryGeoCheckOverview,
  queryGeoCheckPromptResults,
  queryGeoCheckTimeseries,
} = await import("@notra/db/utils/geo-checks");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

type Scope = Awaited<ReturnType<typeof seedProject>>;

async function seedCheck(
  scope: Scope,
  row: Partial<typeof geoMentionChecks.$inferInsert> & { id: string }
) {
  await testDb
    .insert(geoScans)
    .values({ id: row.scanId ?? "scan", ...scope })
    .onConflictDoNothing();
  await testDb.insert(geoMentionChecks).values({
    ...scope,
    scanId: "scan",
    engine: "engine",
    promptId: "prompt",
    prompt: "prompt",
    answer: "answer",
    mentioned: false,
    capturedAt: new Date(),
    ...row,
  });
}

describe("geo check aggregates", () => {
  test("a project that does not track English still has an overview", async () => {
    const scope = await seedProject("german-only");
    await testDb
      .update(geoSettings)
      .set({ promptLanguage: "German", languages: ["German"] })
      .where(eq(geoSettings.projectId, scope.projectId));
    await seedCheck(scope, { id: "a", language: "German", mentioned: true });
    await seedCheck(scope, {
      id: "b",
      promptId: "other",
      language: "German",
      ownedSourceCited: true,
    });

    const [overview] = await queryGeoCheckOverview(scope, undefined);
    expect(overview).toMatchObject({
      checks: 2,
      mentions: 1,
      citations: 1,
      visibility: 2,
    });
    const results = await queryGeoCheckPromptResults(scope, undefined);
    expect(results).toHaveLength(2);
  });

  test("translations count in the overview but not as extra prompts", async () => {
    const scope = await seedProject("translations");
    await seedCheck(scope, { id: "en", language: "English", mentioned: true });
    await seedCheck(scope, { id: "de", language: "German" });

    const [overview] = await queryGeoCheckOverview(scope, undefined);
    expect(overview).toMatchObject({ checks: 2, mentions: 1 });
    const results = await queryGeoCheckPromptResults(scope, undefined);
    expect(results.map((row) => row.mentioned)).toEqual([true]);
    const languages = await queryGeoCheckLanguageShare(scope, undefined);
    expect(languages.map((row) => row.language).sort()).toEqual([
      "English",
      "German",
    ]);
  });

  test("a multi-turn conversation is one check however many turns it has", async () => {
    const scope = await seedProject("sequence");
    for (const [turn, mentioned] of [
      [1, false],
      [2, true],
      [3, true],
    ] as const) {
      await seedCheck(scope, {
        id: `turn-${turn}`,
        promptId: "sequence-prompt",
        sequenceId: "sequence",
        turn,
        mentioned,
        ownedSourceCited: turn === 3,
      });
    }
    await seedCheck(scope, { id: "single", promptId: "single-prompt" });

    const [overview] = await queryGeoCheckOverview(scope, undefined);
    expect(overview).toMatchObject({
      checks: 2,
      mentions: 1,
      citations: 1,
      visibility: 1,
      mentionRate: 0.5,
    });
    const [totals] = await queryGeoCheckEngineTotals(scope, undefined);
    expect(totals).toMatchObject({ checks: 2, mentions: 1 });
    const series = await queryGeoCheckTimeseries(scope, undefined);
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ checks: 2, mentions: 1 });
    expect(await queryGeoCheckPromptResults(scope, undefined)).toHaveLength(1);
  });

  test("persona conversations count in the overview and stay out of prompt results", async () => {
    const scope = await seedProject("persona");
    await testDb.insert(geoPersonas).values({
      id: "persona",
      ...scope,
      name: "Persona",
      role: "Role",
      company: "Company",
      summary: "Summary",
      searchStyle: "Style",
      profile: {} as typeof geoPersonas.$inferInsert.profile,
      conversationPrompts: ["one", "two"],
    });
    for (const turn of [1, 2]) {
      await seedCheck(scope, {
        id: `persona-${turn}`,
        promptId: "persona-prompt",
        personaId: "persona",
        personaSnapshot:
          {} as typeof geoMentionChecks.$inferInsert.personaSnapshot,
        turn,
        mentioned: true,
      });
    }
    await seedCheck(scope, { id: "tracked", mentioned: false });

    const [overview] = await queryGeoCheckOverview(scope, undefined);
    expect(overview).toMatchObject({ checks: 2, mentions: 1 });
    const results = await queryGeoCheckPromptResults(scope, undefined);
    expect(results.map((row) => row.promptId)).toEqual(["prompt"]);
  });

  test("a competitor's detail timeseries matches its share count", async () => {
    const scope = await seedProject("competitor");
    await testDb.insert(geoPersonas).values({
      id: "persona",
      ...scope,
      name: "Persona",
      role: "Role",
      company: "Company",
      summary: "Summary",
      searchStyle: "Style",
      profile: {} as typeof geoPersonas.$inferInsert.profile,
      conversationPrompts: ["one", "two"],
    });
    for (const turn of [1, 2, 3]) {
      await seedCheck(scope, {
        id: `sequence-${turn}`,
        promptId: "sequence-prompt",
        sequenceId: "sequence",
        turn,
        competitors: ["Rival"],
      });
    }
    await seedCheck(scope, {
      id: "persona-1",
      promptId: "persona-prompt",
      personaId: "persona",
      personaSnapshot:
        {} as typeof geoMentionChecks.$inferInsert.personaSnapshot,
      turn: 1,
      competitors: ["Rival"],
    });
    await seedCheck(scope, { id: "single" });

    const [share] = await queryGeoCheckCompetitorShare(scope, undefined, 5);
    const series = await queryGeoCheckCompetitorTimeseries(
      scope,
      "Rival",
      undefined
    );
    expect(share).toMatchObject({ brand: "Rival", mentions: 2 });
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ mentions: 2, checks: 3 });
  });
});
