import "./utils/infrastructure";
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";

import type { GeoContentBrief } from "@notra/ai/types/geo-writer";
import { geoContentBriefs } from "@notra/db/schema";
import { Effect } from "effect";

import { geoBriefToMarkdown } from "../src/utils/geo-writer-brief-markdown";
import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";

const { updateGeoContentBrief } = await import("../src/geo/writer");

const brief: GeoContentBrief = {
  targetPrompt: "Which content tools should I compare?",
  intent: "Compare options",
  contentSubtype: "comparison",
  workingTitle: "Content tools compared",
  audience: "Marketing teams",
  jobToBeDone: "Choose a content tool",
  sections: [
    { heading: "Options", goal: "List options", claims: [] },
    { heading: "Criteria", goal: "Compare criteria", claims: [] },
    { heading: "Decision", goal: "Choose one", claims: [] },
  ],
  questionsToAnswer: [],
  internalLinks: [],
  acceptanceChecklist: [],
};

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

test("a brief revision saves in a non-UTC database session", async () => {
  await database.postgres.exec("SET TIME ZONE 'Europe/Berlin'");
  const scope = await seedProject("selected");
  const [row] = await testDb
    .insert(geoContentBriefs)
    .values({
      id: "brief-selected",
      ...scope,
      brandSettingsId: "brand-selected",
      topic: brief.targetPrompt,
      brief,
    })
    .returning();
  if (!row) {
    throw new Error("Brief insert failed");
  }

  const update = () =>
    Effect.runPromise(
      updateGeoContentBrief({
        ...scope,
        briefId: row.id,
        expectedUpdatedAt: row.updatedAt.toISOString(),
        markdown: geoBriefToMarkdown(brief),
      })
    );
  const saved = await update();

  expect(saved.id).toBe(row.id);
  expect(new Date(saved.updatedAt).getTime()).toBeGreaterThan(
    row.updatedAt.getTime()
  );
  await expect(update()).rejects.toMatchObject({
    _tag: "GeoContentBriefConflictError",
  });
});
