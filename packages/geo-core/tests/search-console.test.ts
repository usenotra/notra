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
} from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect, Result } from "effect";

import { GeoModelService, GeoSearchConsoleService } from "../src/deps";
import { GeoModelError } from "../src/schemas/model-errors";
import { GeoSearchConsoleError } from "../src/schemas/search-console-errors";
import { fakeModels } from "./constants/geo-boundaries";
import {
  initializeDatabase,
  resetDatabase,
  database,
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
  test("disconnecting and unselected integrations skip generation", async () => {
    await seedGsc();
    const models = {
      ...fakeModels,
      suggest: () => Effect.die("Skipped integrations must not generate"),
    };
    await testDb.update(googleSearchConsoleIntegrations).set({ siteUrl: null });
    expect(
      await Effect.runPromise(
        withGscServices(syncGscSuggestions("org-test"), models)
      )
    ).toEqual({ status: "skipped", reason: "no_site_selected" });
    await testDb
      .update(googleSearchConsoleIntegrations)
      .set({ disconnectingAt: new Date() });
    expect(
      await Effect.runPromise(
        withGscServices(syncGscSuggestions("org-test"), models)
      )
    ).toEqual({ status: "skipped", reason: "integration_changed" });
  });

  test("empty keywords replace pending rows but preserve curated decisions", async () => {
    await seedGsc();
    await seedSuggestion("dismissed");
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
  test("missing integration and reauth state skip without model calls", async () => {
    expect(
      await Effect.runPromise(withGscServices(syncGscSuggestions("absent")))
    ).toEqual({ status: "skipped", reason: "not_connected" });
    const integration = await seedGsc();
    expect(
      await Effect.runPromise(
        withGscServices(
          selectGscSiteAndSyncSuggestions(
            { ...integration, status: "reauth_required" },
            integration.siteUrl ?? ""
          )
        )
      )
    ).toEqual({ status: "skipped", reason: "reauth_required" });
  });

  test("site selection replaces pending suggestions and saves the site and sync time", async () => {
    const integration = await seedGsc();
    const outcome = await Effect.runPromise(
      withGscServices(
        selectGscSiteAndSyncSuggestions(integration, "https://new.example")
      )
    );
    expect(outcome).toEqual({
      status: "completed",
      keywords: 1,
      suggestionsAdded: 1,
    });
    const rows = await testDb.select().from(geoPromptSuggestions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.prompt).toBe("What are the best tools for sending email?");
    expect(
      (await testDb.query.googleSearchConsoleIntegrations.findFirst())
        ?.lastSyncedAt
    ).not.toBeNull();
    expect(
      (await testDb.query.googleSearchConsoleIntegrations.findFirst())?.siteUrl
    ).toBe("https://new.example");
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
    expect(
      (await testDb.query.googleSearchConsoleIntegrations.findFirst())
        ?.lastError
    ).toBe(
      "We could not turn your Search Console keywords into prompt suggestions."
    );
  });

  test("Google reauth failure is typed and does not overwrite auth state", async () => {
    await seedGsc();
    const result = await Effect.runPromise(
      syncGscSuggestions("org-test").pipe(
        Effect.provideService(GeoModelService, fakeModels),
        Effect.provideService(GeoSearchConsoleService, {
          topQueries: () =>
            Effect.fail(
              new GeoSearchConsoleError({
                reauthRequired: true,
                cause: new Error("expired"),
              })
            ),
        }),
        Effect.result
      )
    );
    assert.ok(Result.isFailure(result));
    expect(result.failure._tag).toBe("GeoSearchConsoleError");
    expect(
      (await testDb.query.googleSearchConsoleIntegrations.findFirst())
        ?.lastError
    ).toBeNull();
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
