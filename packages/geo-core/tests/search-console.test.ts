import "./utils/infrastructure";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import assert from "node:assert/strict";

import {
  geoPromptSuggestions,
  googleSearchConsoleIntegrations,
  projects,
} from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect, Result } from "effect";

import { GeoModelService, GeoSearchConsoleService } from "../src/deps";
import { GeoModelError } from "../src/schemas/model-errors";
import { fakeModels } from "./constants/geo-boundaries";
import {
  initializeDatabase,
  resetDatabase,
  database,
  seedProject,
  testDb,
} from "./utils/database";
import {
  seedSuggestion,
  seedGsc,
  withGscServices,
} from "./utils/geo-boundaries";

const { syncGscSuggestions, selectGscSiteAndSyncSuggestions } =
  await import("../src/geo/search-console");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

describe("Search Console Effect sync", () => {
  test("empty keywords replace pending rows but preserve curated decisions", async () => {
    await seedGsc();
    await seedSuggestion("dismissed", "org-test", "gsc");
    await testDb
      .update(geoPromptSuggestions)
      .set({ status: "dismissed" })
      .where(eq(geoPromptSuggestions.id, "dismissed"));
    const result = await Effect.runPromise(
      syncGscSuggestions("org-test").pipe(
        Effect.provideService(GeoModelService, {
          ...fakeModels,
          suggest: () => Effect.die("No keywords must not generate"),
        }),
        Effect.provideService(GeoSearchConsoleService, {
          topQueries: () => Effect.succeed([]),
        })
      )
    );
    expect(result).toEqual({
      status: "completed",
      keywords: 0,
      suggestionsAdded: 0,
    });
    const rows = await testDb.select().from(geoPromptSuggestions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("dismissed");
  });

  test("syncing another project preserves the first project's property and suggestions", async () => {
    const integration = await seedGsc();
    await seedProject("other");
    await seedSuggestion("other-old", "org-test", "other");
    const outcome = await Effect.runPromise(
      withGscServices(
        selectGscSiteAndSyncSuggestions(
          integration,
          "https://other.example",
          "other"
        )
      )
    );
    expect(outcome.status).toBe("completed");
    const rows = await testDb.select().from(geoPromptSuggestions);
    expect(
      rows.filter((row) => row.projectId === "gsc").map((row) => row.id)
    ).toEqual(["old-pending"]);
    expect(rows.filter((row) => row.projectId === "other")).toHaveLength(1);
    expect(
      (await testDb.query.projects.findFirst({ where: eq(projects.id, "gsc") }))
        ?.gscSiteUrl
    ).toBe("https://example.com");
    expect(
      (
        await testDb.query.projects.findFirst({
          where: eq(projects.id, "other"),
        })
      )?.gscSiteUrl
    ).toBe("https://other.example");
  });

  test("integration changed during generation cannot replace pending rows", async () => {
    await seedGsc();
    const outcome = await Effect.runPromise(
      withGscServices(syncGscSuggestions("org-test"), {
        ...fakeModels,
        suggest: (input) =>
          Effect.gen(function* () {
            yield* Effect.promise(() =>
              testDb
                .update(googleSearchConsoleIntegrations)
                .set({ siteUrl: "https://changed.example" })
            );
            return yield* fakeModels.suggest(input);
          }),
      })
    );
    expect(outcome).toEqual({
      status: "skipped",
      reason: "integration_changed",
    });
    expect((await testDb.query.geoPromptSuggestions.findFirst())?.id).toBe(
      "old-pending"
    );
  });

  test("project changed during generation does not stamp the integration", async () => {
    await seedGsc();
    const outcome = await Effect.runPromise(
      withGscServices(syncGscSuggestions("org-test"), {
        ...fakeModels,
        suggest: (input) =>
          Effect.gen(function* () {
            yield* Effect.promise(() =>
              testDb
                .update(projects)
                .set({ gscSiteUrl: "https://changed.example" })
                .where(eq(projects.id, "gsc"))
            );
            return yield* fakeModels.suggest(input);
          }),
      })
    );
    expect(outcome).toEqual({
      status: "skipped",
      reason: "integration_changed",
    });
    expect(
      (await testDb.query.googleSearchConsoleIntegrations.findFirst())
        ?.lastSyncedAt
    ).toBeNull();
    expect((await testDb.query.geoPromptSuggestions.findFirst())?.id).toBe(
      "old-pending"
    );
  });

  test("generation failure preserves pending rows and stores curated copy", async () => {
    await seedGsc();
    const result = await Effect.runPromise(
      withGscServices(syncGscSuggestions("org-test"), {
        ...fakeModels,
        suggest: () =>
          Effect.fail(
            new GeoModelError({
              operation: "suggest",
              cause: new Error("private test diagnostic"),
            })
          ),
      }).pipe(Effect.result)
    );
    assert.ok(Result.isFailure(result));
    expect(result.failure._tag).toBe("GeoModelError");
    expect((await testDb.query.geoPromptSuggestions.findFirst())?.id).toBe(
      "old-pending"
    );
    expect((await testDb.query.projects.findFirst())?.gscLastError).toBe(
      "We could not turn your Search Console keywords into prompt suggestions."
    );
  });

  test("transaction failure rolls back deletion and lastSyncedAt", async () => {
    await seedGsc();
    await database.postgres.exec(
      "ALTER TABLE geo_prompt_suggestions ADD CONSTRAINT reject_new CHECK (id = 'old-pending') NOT VALID"
    );
    try {
      const result = await Effect.runPromise(
        withGscServices(syncGscSuggestions("org-test")).pipe(Effect.result)
      );
      assert.ok(Result.isFailure(result));
      expect(result.failure._tag).toBe("GeoDatabaseError");
      expect((await testDb.query.geoPromptSuggestions.findFirst())?.id).toBe(
        "old-pending"
      );
      expect(
        (await testDb.query.googleSearchConsoleIntegrations.findFirst())
          ?.lastSyncedAt
      ).toBeNull();
    } finally {
      await database.postgres.exec(
        "ALTER TABLE geo_prompt_suggestions DROP CONSTRAINT reject_new"
      );
    }
  });
});
