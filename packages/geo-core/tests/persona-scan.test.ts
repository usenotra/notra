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

import {
  geoMentionChecks,
  geoPersonaMemories,
  geoPersonas,
  geoScans,
} from "@notra/db/schema";
import { createPersonaSnapshot } from "@notra/db/utils/persona-snapshot";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { GEO_PERSONA_MAX_COUNT } from "../src/constants/geo-personas";
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

const {
  deleteGeoPersona,
  listGeoPersonas,
  loadGeoPersonaActivity,
  persistGeneratedPersonas,
  requireGeoPersonaGenerationCapacity,
  restoreGeoPersona,
  updateGeoPersona,
} = await import("../src/geo/personas");
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

  test("archives a persona without deleting memories or historical checks", async () => {
    const scope = await seedProject("persona-archive");
    const [persona] = await Effect.runPromise(
      persistGeneratedPersonas(scope.organizationId, scope.projectId, {
        personas: [generatedPersona],
      })
    );
    assert.ok(persona);
    const scanId = "scan-persona-archive";
    await testDb.insert(geoScans).values({
      id: scanId,
      organizationId: scope.organizationId,
      projectId: scope.projectId,
      status: "completed",
    });
    const snapshot = createPersonaSnapshot(
      persona,
      persona.memories,
      persona.conversationPrompts
    );
    const revisedSnapshot = createPersonaSnapshot(
      { ...persona, role: `${persona.role} with procurement ownership` },
      persona.memories,
      persona.conversationPrompts
    );
    await testDb.insert(geoMentionChecks).values([
      {
        id: "check-persona-archive",
        organizationId: scope.organizationId,
        projectId: scope.projectId,
        scanId,
        engine: "test/grounded",
        promptId: `persona-${persona.id}`,
        personaId: persona.id,
        personaSnapshot: snapshot,
        turn: 1,
        prompt: persona.conversationPrompts[0] ?? "Which tool should I buy?",
        answer: "Selected is a good choice.",
        mentioned: true,
        capturedAt: new Date(),
      },
      {
        id: "check-persona-archive-revised",
        organizationId: scope.organizationId,
        projectId: scope.projectId,
        scanId,
        engine: "test/grounded",
        promptId: `persona-${persona.id}`,
        personaId: persona.id,
        personaSnapshot: revisedSnapshot,
        turn: 2,
        prompt: persona.conversationPrompts[1] ?? "Which tool is safest?",
        answer: "Another option is safer.",
        mentioned: false,
        capturedAt: new Date(),
      },
    ]);

    await Effect.runPromise(deleteGeoPersona(scope, persona.id));

    const [archived] = await testDb
      .select()
      .from(geoPersonas)
      .where(eq(geoPersonas.id, persona.id));
    expect(archived?.archivedAt).toBeInstanceOf(Date);
    expect(archived?.enabled).toBe(false);
    expect(await testDb.select().from(geoPersonaMemories)).toHaveLength(1);
    expect(await testDb.select().from(geoMentionChecks)).toHaveLength(2);
    const activity = await Effect.runPromise(
      loadGeoPersonaActivity({ ...scope, days: 1 })
    );
    expect(activity.points).toHaveLength(2);
    expect(
      new Set(activity.points.map((point) => point.snapshotVersion))
    ).toEqual(new Set([snapshot.version, revisedSnapshot.version]));
    expect(activity.points.every((point) => point.lastCheckedAt)).toBe(true);
    const listed = (await Effect.runPromise(listGeoPersonas(scope))).personas;
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: persona.id,
      enabled: false,
    });
    expect(listed[0]?.archivedAt).toBeTruthy();
    await expect(
      Effect.runPromise(
        requireGeoPersonaGenerationCapacity(scope, undefined, "replacement")
      )
    ).resolves.toMatchObject(scope);
  });

  test("restores an archived persona as paused and enforces the active limit", async () => {
    const scope = await seedProject("persona-restore");
    const [toArchive, active] = await Effect.runPromise(
      persistGeneratedPersonas(scope.organizationId, scope.projectId, {
        personas: [
          { ...generatedPersona, name: "Restore later" },
          { ...generatedPersona, name: "Stay active" },
        ],
      })
    );
    assert.ok(toArchive);
    assert.ok(active);

    await Effect.runPromise(deleteGeoPersona(scope, toArchive.id));

    const archivedList = (await Effect.runPromise(listGeoPersonas(scope)))
      .personas;
    expect(archivedList.map((persona) => persona.id)).toEqual([
      active.id,
      toArchive.id,
    ]);
    expect(archivedList[1]?.archivedAt).toBeTruthy();

    const restored = await Effect.runPromise(
      restoreGeoPersona(scope, toArchive.id)
    );
    expect(restored).toMatchObject({
      id: toArchive.id,
      archivedAt: null,
      enabled: false,
    });

    await Effect.runPromise(deleteGeoPersona(scope, toArchive.id));
    await Effect.runPromise(
      persistGeneratedPersonas(scope.organizationId, scope.projectId, {
        personas: Array.from(
          { length: GEO_PERSONA_MAX_COUNT - 1 },
          (_, index) => ({ ...generatedPersona, name: `Active ${index + 2}` })
        ),
      })
    );

    await expect(
      Effect.runPromise(restoreGeoPersona(scope, toArchive.id))
    ).rejects.toMatchObject({
      _tag: "GeoPersonaLimitError",
      limit: GEO_PERSONA_MAX_COUNT,
    });
  });

  test("invalidates prompts on profile edits but not scan toggles", async () => {
    const scope = await seedProject("persona-prompt-invalidation");
    const [persona] = await Effect.runPromise(
      persistGeneratedPersonas(scope.organizationId, scope.projectId, {
        personas: [generatedPersona],
      })
    );
    assert.ok(persona);

    const paused = await Effect.runPromise(
      updateGeoPersona(scope, { personaId: persona.id, enabled: false })
    );
    expect(paused.conversationPrompts).toEqual(persona.conversationPrompts);

    const unchanged = await Effect.runPromise(
      updateGeoPersona(scope, {
        personaId: persona.id,
        details: {
          name: paused.name,
          role: paused.role,
          company: paused.company,
          summary: paused.summary,
          searchStyle: paused.searchStyle,
          profile: paused.profile,
        },
      })
    );
    expect(unchanged.conversationPrompts).toEqual(persona.conversationPrompts);

    const edited = await Effect.runPromise(
      updateGeoPersona(scope, {
        personaId: persona.id,
        details: {
          name: persona.name,
          role: persona.role,
          company: persona.company,
          summary: "Now prioritizes low implementation risk",
          searchStyle: persona.searchStyle,
          profile: persona.profile,
        },
      })
    );
    expect(edited.conversationPrompts).toEqual([]);
    expect(edited.enabled).toBe(false);

    const originalMemoryIds = edited.memories.map((memory) => memory.id);
    const regenerated = await Effect.runPromise(
      persistGeneratedPersonas(
        scope.organizationId,
        scope.projectId,
        {
          personas: [
            {
              ...generatedPersona,
              conversationPrompts: [
                "Which tools minimize implementation risk?",
                "Which option has the safest migration path?",
              ],
            },
          ],
        },
        edited,
        true
      )
    );
    const refreshed = regenerated.find((entry) => entry.id === persona.id);
    expect(refreshed?.conversationPrompts).toEqual([
      "Which tools minimize implementation risk?",
      "Which option has the safest migration path?",
    ]);
    expect(refreshed?.summary).toBe(edited.summary);
    expect(refreshed?.enabled).toBe(false);
    expect(refreshed?.memories.map((memory) => memory.id)).toEqual(
      originalMemoryIds
    );
  });

  test("does not persist prompts generated from stale persona details", async () => {
    const scope = await seedProject("persona-stale-prompts");
    const [persona] = await Effect.runPromise(
      persistGeneratedPersonas(scope.organizationId, scope.projectId, {
        personas: [generatedPersona],
      })
    );
    assert.ok(persona);

    const generationTarget = await Effect.runPromise(
      updateGeoPersona(scope, {
        personaId: persona.id,
        details: {
          name: persona.name,
          role: persona.role,
          company: persona.company,
          summary: "Needs a low-risk implementation",
          searchStyle: persona.searchStyle,
          profile: persona.profile,
        },
      })
    );
    const latest = await Effect.runPromise(
      updateGeoPersona(scope, {
        personaId: persona.id,
        details: {
          name: persona.name,
          role: persona.role,
          company: persona.company,
          summary: "Needs a fast implementation",
          searchStyle: persona.searchStyle,
          profile: persona.profile,
        },
      })
    );

    await expect(
      Effect.runPromise(
        persistGeneratedPersonas(
          scope.organizationId,
          scope.projectId,
          {
            personas: [
              {
                ...generatedPersona,
                conversationPrompts: [
                  "Which tools minimize implementation risk?",
                  "Which option has the safest migration path?",
                ],
              },
            ],
          },
          generationTarget,
          true
        )
      )
    ).rejects.toMatchObject({ _tag: "GeoPersonaGenerateError" });

    const [persisted] = (await Effect.runPromise(listGeoPersonas(scope)))
      .personas;
    expect(persisted?.summary).toBe(latest.summary);
    expect(persisted?.conversationPrompts).toEqual([]);
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
    expect(plan.tasks.every((task) => task.groundedKey !== null)).toBe(true);
    expect(plan.personas.length).toBeGreaterThan(1);
    const snapshot = plan.personas[0]?.snapshot;
    assert.ok(snapshot);
    expect(snapshot.persona.name).toBe(persona.name);
    expect(snapshot.memories).toEqual(persona.memories);
    expect(snapshot.conversationPrompts).toEqual(persona.conversationPrompts);

    let regenerationTarget = persona;
    for (const planned of plan.personas) {
      const regenerated = await Effect.runPromise(
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
          regenerationTarget
        )
      );
      regenerationTarget =
        regenerated.find((entry) => entry.id === persona.id) ??
        regenerationTarget;
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

    await Effect.runPromise(deleteGeoPersona(scope, persona.id));
    const checksBeforeArchivedReplay = rows.length;
    const paused = await Effect.runPromise(
      runGeoScanPersonaBatch(plan.context, plan.personas).pipe(
        Effect.provideService(GeoModelService, fakeModels),
        Effect.provideService(GeoFeatureFlagService, testFeatureFlags)
      )
    );
    expect(paused.checks).toBe(0);
    expect(await testDb.select().from(geoMentionChecks)).toHaveLength(
      checksBeforeArchivedReplay
    );
  });
});
