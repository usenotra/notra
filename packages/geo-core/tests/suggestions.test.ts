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

import { geoPrompts } from "@notra/db/schema";
import { Effect, Result } from "effect";

import {
  initializeDatabase,
  resetDatabase,
  database,
  seedProject,
  testDb,
} from "./utils/database";
import { seedSuggestion } from "./utils/geo-boundaries";

const {
  acceptSuggestion,
  acceptAllSuggestions,
  dismissSuggestion,
  listSuggestions,
} = await import("../src/geo/suggestions");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

describe("suggestion transactions", () => {
  test("accept targets the selected project and reuses normalized duplicates", async () => {
    await seedProject("default");
    const scope = await seedProject("selected");
    await seedSuggestion();
    await testDb.insert(geoPrompts).values({
      id: "existing",
      ...scope,
      prompt: "  WHICH SUGGESTION TOOLS SHOULD I USE?  ",
    });
    const result = await Effect.runPromise(
      acceptSuggestion({ ...scope, suggestionId: "suggestion" })
    );
    expect(result.prompt.id).toBe("existing");
    expect(result.projectId).toBe("selected");
    expect(await testDb.select().from(geoPrompts)).toHaveLength(1);
    expect(
      (await testDb.query.geoPromptSuggestions.findFirst())?.acceptedPromptId
    ).toBe("existing");
  });

  test("foreign suggestions and foreign projects are refused", async () => {
    const scope = await seedProject("own");
    await seedProject("foreign", { organizationId: "other-org" });
    await seedSuggestion("foreign-suggestion", "other-org");
    const result = await Effect.runPromise(
      acceptSuggestion({ ...scope, suggestionId: "foreign-suggestion" }).pipe(
        Effect.result
      )
    );
    assert.ok(Result.isFailure(result));
    expect(result.failure._tag).toBe("GeoSuggestionNotFoundError");
    const foreignProject = await Effect.runPromise(
      acceptSuggestion({
        organizationId: scope.organizationId,
        projectId: "foreign",
        suggestionId: "foreign-suggestion",
      }).pipe(Effect.result)
    );
    assert.ok(Result.isFailure(foreignProject));
    expect(foreignProject.failure._tag).toBe("GeoProjectNotFoundError");
  });

  test("list, dismiss, and accept-all retain pending-only transitions", async () => {
    expect(
      (
        await Effect.runPromise(
          acceptAllSuggestions({ organizationId: "absent" })
        )
      ).accepted
    ).toBe(0);
    const scope = await seedProject("selected");
    await seedSuggestion("one");
    await seedSuggestion("two");
    await seedSuggestion("three");
    expect(
      (await Effect.runPromise(listSuggestions(scope))).suggestions
    ).toHaveLength(3);
    await Effect.runPromise(
      dismissSuggestion({ ...scope, suggestionId: "one" })
    );
    const dismissedAcceptance = await Effect.runPromise(
      acceptSuggestion({ ...scope, suggestionId: "one" }).pipe(Effect.result)
    );
    assert.ok(Result.isFailure(dismissedAcceptance));
    expect(dismissedAcceptance.failure._tag).toBe("GeoSuggestionNotFoundError");
    expect(
      (await Effect.runPromise(acceptAllSuggestions(scope))).accepted
    ).toBe(2);
    expect(
      (await Effect.runPromise(listSuggestions(scope))).suggestions
    ).toHaveLength(0);
    expect(
      (await Effect.runPromise(acceptAllSuggestions(scope))).accepted
    ).toBe(0);
    expect(await testDb.select().from(geoPrompts)).toHaveLength(2);
  });

  test("status write failure rolls back prompt insertion", async () => {
    const scope = await seedProject("selected");
    await seedSuggestion();
    await database.postgres.exec(
      "ALTER TABLE geo_prompt_suggestions ADD CONSTRAINT reject_accept CHECK (status <> 'accepted') NOT VALID"
    );
    try {
      const result = await Effect.runPromise(
        acceptSuggestion({ ...scope, suggestionId: "suggestion" }).pipe(
          Effect.result
        )
      );
      assert.ok(Result.isFailure(result));
      expect(result.failure._tag).toBe("GeoDatabaseError");
      expect(await testDb.select().from(geoPrompts)).toHaveLength(0);
      expect(
        (await testDb.query.geoPromptSuggestions.findFirst())?.status
      ).toBe("pending");
    } finally {
      await database.postgres.exec(
        "ALTER TABLE geo_prompt_suggestions DROP CONSTRAINT reject_accept"
      );
    }
  });

  test("accepted suggestions cannot be accepted or dismissed again", async () => {
    const scope = await seedProject("selected");
    await seedSuggestion();
    const program = acceptSuggestion({
      ...scope,
      suggestionId: "suggestion",
    }).pipe(Effect.result);
    const accepted = await Effect.runPromise(program);
    assert.ok(Result.isSuccess(accepted));
    const repeated = await Effect.runPromise(program);
    assert.ok(Result.isFailure(repeated));
    expect(repeated.failure._tag).toBe("GeoSuggestionNotFoundError");
    const dismissed = await Effect.runPromise(
      dismissSuggestion({ ...scope, suggestionId: "suggestion" }).pipe(
        Effect.result
      )
    );
    assert.ok(Result.isFailure(dismissed));
    expect(dismissed.failure._tag).toBe("GeoSuggestionNotFoundError");
    expect(await testDb.select().from(geoPrompts)).toHaveLength(1);
  });
});
