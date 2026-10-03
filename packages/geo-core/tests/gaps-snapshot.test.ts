import "./utils/infrastructure";
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";

import {
  geoContentGapSnapshots,
  geoMentionChecks,
  geoPromptSuggestions,
  geoScans,
} from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";

const { loadGeoContentGaps, refreshGeoContentGaps } =
  await import("../src/geo/gaps");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

test("the first read builds and saves a missing snapshot", async () => {
  const scope = await seedProject("existing");
  await testDb.insert(geoScans).values({ id: "scan", ...scope });
  await testDb.insert(geoMentionChecks).values({
    id: "check",
    ...scope,
    scanId: "scan",
    promptId: "prompt",
    prompt: "Which content tools should I use?",
    engine: "openai",
    answer: "Answer",
    mentioned: false,
    ownedSourceCited: false,
    grounding: { queries: [], sources: [] },
    capturedAt: new Date(),
  });

  const first = await Effect.runPromise(loadGeoContentGaps(scope));
  expect(first).toMatchObject({ hasScanData: true, snapshotReady: true });
  const saved = await testDb
    .select()
    .from(geoContentGapSnapshots)
    .where(eq(geoContentGapSnapshots.projectId, scope.projectId));
  expect(saved).toHaveLength(1);

  // Later reads return the saved snapshot instead of recomputing it.
  await testDb
    .update(geoContentGapSnapshots)
    .set({ snapshot: { ...first, promptGaps: [] } })
    .where(eq(geoContentGapSnapshots.projectId, scope.projectId));
  expect(
    (await Effect.runPromise(loadGeoContentGaps(scope))).promptGaps
  ).toEqual([]);
  expect(first.promptGaps.length).toBeGreaterThan(0);
});

test("content gaps reads the saved project snapshot", async () => {
  const scope = await seedProject("selected");
  const snapshot = {
    promptGaps: [],
    searchGaps: [],
    aiSearchGaps: [],
    hasScanData: true,
  };
  await testDb
    .insert(geoContentGapSnapshots)
    .values({ ...scope, snapshot, updatedAt: new Date() });

  expect(await Effect.runPromise(loadGeoContentGaps(scope))).toEqual({
    ...snapshot,
    snapshotReady: true,
  });
});

test("AI search gaps exclude checks that mention or cite the project", async () => {
  const scope = await seedProject("selected");
  await testDb.insert(geoScans).values({ id: "scan", ...scope });
  await testDb.insert(geoMentionChecks).values(
    [
      { id: "uncovered-1", query: "content generation tools" },
      { id: "uncovered-2", query: "content generation tools" },
      { id: "mentioned", query: "mentioned content tools", mentioned: true },
      { id: "cited", query: "cited content tools", ownedSourceCited: true },
      { id: "mixed-uncovered-1", query: "mixed content tools" },
      { id: "mixed-uncovered-2", query: "mixed content tools" },
      {
        id: "mixed-cited-1",
        query: "mixed content tools",
        ownedSourceCited: true,
      },
      {
        id: "mixed-cited-2",
        query: "mixed content tools",
        ownedSourceCited: true,
      },
      ...Array.from({ length: 10 }, (_, index) => ({
        id: `mostly-covered-${index}`,
        query: "mostly covered tools",
        mentioned: index < 8,
      })),
    ].map((check) => ({
      id: check.id,
      ...scope,
      scanId: "scan",
      promptId: check.id,
      prompt: "Which content tools should I use?",
      engine: check.id.startsWith("mixed-cited") ? "anthropic" : "openai",
      answer: "Answer",
      mentioned: check.mentioned ?? false,
      ownedSourceCited: check.ownedSourceCited ?? false,
      grounding: { queries: [check.query], sources: [] },
      capturedAt: new Date(),
    }))
  );

  const snapshot = await Effect.runPromise(refreshGeoContentGaps(scope));
  expect(snapshot.snapshotReady).toBe(true);
  expect(snapshot.aiSearchGaps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        query: "content generation tools",
        searches: 2,
      }),
      expect.objectContaining({
        query: "mixed content tools",
        searches: 2,
        ownMentionRate: 0.5,
        engines: ["openai"],
      }),
    ])
  );
  expect(snapshot.aiSearchGaps).toHaveLength(2);
  expect(await Effect.runPromise(loadGeoContentGaps(scope))).toEqual(snapshot);
});

test("one uncovered AI search is enough when Search Console confirms the query", async () => {
  const scope = await seedProject("selected");
  await testDb.insert(geoScans).values({ id: "scan", ...scope });
  await testDb.insert(geoPromptSuggestions).values({
    id: "gsc-gap",
    ...scope,
    prompt: "AI content generation tools 2026",
    sourceKeywords: [
      {
        query: "AI content generation tools 2026",
        clicks: 2,
        impressions: 100,
        position: 12,
      },
    ],
  });
  await testDb.insert(geoMentionChecks).values(
    [
      { id: "corroborated", query: "best AI content generation tools 2026" },
      { id: "ai-only", query: "content scheduling tools" },
    ].map((check) => ({
      id: check.id,
      ...scope,
      scanId: "scan",
      promptId: check.id,
      prompt: "Which content tools should I use?",
      engine: "openai",
      answer: "Answer",
      mentioned: false,
      ownedSourceCited: false,
      grounding: { queries: [check.query], sources: [] },
      capturedAt: new Date(),
    }))
  );

  const snapshot = await Effect.runPromise(refreshGeoContentGaps(scope));
  expect(snapshot.aiSearchGaps).toEqual([
    expect.objectContaining({
      query: "best AI content generation tools 2026",
      searches: 1,
    }),
  ]);
});

test("Search Console confirms AI searches regardless of the year in the query", async () => {
  const scope = await seedProject("selected");
  await testDb.insert(geoScans).values({ id: "scan", ...scope });
  await testDb.insert(geoPromptSuggestions).values({
    id: "gsc-gap",
    ...scope,
    prompt: "content scheduling tools",
    sourceKeywords: [
      {
        query: "content scheduling tools",
        clicks: 1,
        impressions: 80,
        position: 14,
      },
    ],
  });
  await testDb.insert(geoMentionChecks).values(
    [
      { id: "uncovered", query: "content scheduling tools 2026" },
      {
        id: "covered-variant",
        query: "content scheduling tools 2025",
        mentioned: true,
      },
    ].map((check) => ({
      id: check.id,
      ...scope,
      scanId: "scan",
      promptId: check.id,
      prompt: "Which content tools should I use?",
      engine: "openai",
      answer: "Answer",
      mentioned: check.mentioned ?? false,
      ownedSourceCited: false,
      grounding: { queries: [check.query], sources: [] },
      capturedAt: new Date(),
    }))
  );

  const snapshot = await Effect.runPromise(refreshGeoContentGaps(scope));
  expect(snapshot.aiSearchGaps).toEqual([
    expect.objectContaining({
      query: "content scheduling tools 2026",
      variants: [],
      searches: 1,
    }),
  ]);
});
