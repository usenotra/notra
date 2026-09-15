import "./utils/infrastructure";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import assert from "node:assert/strict";

import { geoMentionChecks, geoPersonas } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GeoContentBillingService,
  GeoEntitlementService,
  GeoFeatureFlagService,
  GeoModelService,
} from "../src/deps";
import {
  fakeModels,
  testBillingGate,
  testFeatureFlags,
} from "./constants/geo-boundaries";
import { generatedPersona } from "./constants/personas";
import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
  testDb,
} from "./utils/database";

const { persistGeneratedPersonas } = await import("../src/geo/personas");
const { prepareGeoScanProject } = await import("../src/geo/scan");
const { runGeoScanPersonaBatch } = await import("../src/geo/persona-scan");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

describe("persona persistence", () => {
  test("returns the committed response without a separate database read", async () => {
    const scope = await seedProject("persona-response");
    const read = spyOn(testDb.query.geoPersonas, "findMany").mockImplementation(
      () => {
        throw new Error("Connection unavailable outside the transaction");
      }
    );
    try {
      const personas = await Effect.runPromise(
        persistGeneratedPersonas(scope.organizationId, scope.projectId, {
          personas: [generatedPersona],
        })
      );
      expect(personas).toHaveLength(1);
      expect(personas[0]?.name).toBe(generatedPersona.name);
      expect(personas[0]?.memories[0]?.content).toBe(
        generatedPersona.memories[0]?.content
      );
      expect(read).not.toHaveBeenCalled();
      expect(await testDb.select().from(geoPersonas)).toHaveLength(1);
    } finally {
      read.mockRestore();
    }
  });

  test("rolls back generated personas when building the response fails", async () => {
    const scope = await seedProject("persona-rollback");
    const transaction = database.postgres.transaction.bind(database.postgres);
    const intercepted = spyOn(
      database.postgres,
      "transaction"
    ).mockImplementation((callback) =>
      transaction(async (tx) => {
        const query = tx.query.bind(tx);
        const read = spyOn(tx, "query").mockImplementation(
          (sql, params, options) => {
            if (
              sql.startsWith("select") &&
              sql.includes('from "geo_personas"')
            ) {
              throw new Error("Response lookup failed");
            }
            return query(sql, params, options);
          }
        );
        try {
          return await callback(tx);
        } finally {
          read.mockRestore();
        }
      })
    );
    try {
      await expect(
        Effect.runPromise(
          persistGeneratedPersonas(scope.organizationId, scope.projectId, {
            personas: [generatedPersona],
          })
        )
      ).rejects.toThrow();
      expect(await testDb.select().from(geoPersonas)).toHaveLength(0);
    } finally {
      intercepted.mockRestore();
    }
  });
});

describe("planned persona snapshots", () => {
  test("keeps the original prompts, profile and memories across batches after regeneration", async () => {
    const scope = await seedProject("persona-snapshot", {
      enabled: true,
    });
    const original = await Effect.runPromise(
      persistGeneratedPersonas(scope.organizationId, scope.projectId, {
        personas: [generatedPersona],
      })
    );
    const persona = original[0];
    assert.ok(persona);
    const prepared = await Effect.runPromise(
      prepareGeoScanProject(scope.organizationId, scope.projectId).pipe(
        Effect.provideService(GeoContentBillingService, {
          gateContentBilling: () => Effect.succeed(testBillingGate),
          finalizeContentBilling: () => Effect.void,
        }),
        Effect.provideService(GeoFeatureFlagService, testFeatureFlags),
        Effect.provideService(GeoModelService, fakeModels),
        Effect.provideService(GeoEntitlementService, {
          resolveZdrEntitlement: () => Effect.succeed("not_entitled"),
        })
      )
    );
    assert.ok(prepared.status === "planned");
    const { plan } = prepared;
    expect(plan.personas.length).toBeGreaterThan(1);
    const snapshot = plan.personas[0]?.snapshot;
    assert.ok(snapshot);
    expect(snapshot.persona.name).toBe(persona.name);
    expect(snapshot.memories).toEqual(persona.memories);
    expect(snapshot.conversationPrompts).toEqual(persona.conversationPrompts);

    for (const planned of plan.personas) {
      await Effect.runPromise(
        persistGeneratedPersonas(
          scope.organizationId,
          scope.projectId,
          {
            personas: [
              {
                ...generatedPersona,
                name: "Enterprise buyer",
                goals: ["Scale a large team"],
                conversationPrompts: [
                  "Which enterprise platform should I buy?",
                  "Which has SSO?",
                ],
                memories: [
                  { kind: "background", content: "Runs an enterprise team" },
                ],
              },
            ],
          },
          persona
        )
      );
      const result = await Effect.runPromise(
        runGeoScanPersonaBatch(plan.context, [planned]).pipe(
          Effect.provideService(GeoModelService, {
            ...fakeModels,
            groundedAnswer: ({ messages }) => {
              expect(messages.at(-1)?.content).toBe(
                persona.conversationPrompts[(messages.length - 1) / 2]
              );
              return Effect.succeed({
                text: "Selected is a good choice.",
                grounding: { queries: [], sources: [] },
                sources: [],
                finishReason: "stop",
                zdrEnforced: false,
                usage: {
                  inputTokens: 1,
                  outputTokens: 1,
                  totalTokens: 2,
                  inputTokenDetails: {
                    noCacheTokens: 1,
                    cacheReadTokens: 0,
                    cacheWriteTokens: 0,
                  },
                  outputTokenDetails: { textTokens: 1, reasoningTokens: 0 },
                },
              });
            },
          }),
          Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
        )
      );
      expect(result.checks).toBe(persona.conversationPrompts.length);
    }
    const rows = await testDb.select().from(geoMentionChecks);
    expect(rows).toHaveLength(
      plan.personas.length * persona.conversationPrompts.length
    );
    for (const row of rows) {
      expect(row.personaSnapshot).toEqual(snapshot);
      expect(persona.conversationPrompts).toContain(row.prompt);
    }

    await testDb
      .update(geoPersonas)
      .set({ enabled: false })
      .where(eq(geoPersonas.id, persona.id));
    const paused = await Effect.runPromise(
      runGeoScanPersonaBatch(plan.context, plan.personas).pipe(
        Effect.provideService(GeoModelService, fakeModels),
        Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
      )
    );
    expect(paused.checks).toBe(0);
  });
});
