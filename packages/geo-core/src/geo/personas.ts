import { describeContentBillingDenial } from "@notra/ai/billing/content-billing";
import { gateway } from "@notra/ai/gateway";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  brandSitemapPages,
  brandSitemaps,
  geoCompetitors,
  geoPersonaMemories,
  geoPersonas,
  geoPrompts,
  geoSettings,
} from "@notra/db/schema";
import { toGeoCheckWindow } from "@notra/db/utils/geo-checks";
import {
  queryGeoCheckPersonaActivity,
  queryGeoCheckPersonaResults,
  queryGeoCheckPersonaScans,
} from "@notra/db/utils/geo-persona-checks";
import { generateText, Output } from "ai";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
} from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_PERSONA_CONTEXT_PAGE_LIMIT,
  GEO_PERSONA_CONTEXT_PROMPT_LIMIT,
  GEO_PERSONA_GENERATION_MAX_TOKENS,
  GEO_PERSONA_GENERATION_MODEL,
  GEO_PERSONA_GENERATION_SYSTEM_PROMPT,
  GEO_PERSONA_GENERATION_TRIGGER_ID,
  GEO_PERSONA_MAX_COUNT,
  GEO_PERSONA_MIN_COUNT,
  GEO_PERSONA_ACTIVITY_DAYS,
} from "../constants/geo-personas";
import { GeoContentBillingService } from "../deps";
import {
  geoPersonaGenerationSchema,
  geoPersonaRegenerationSchema,
} from "../schemas/geo-personas";
import type { GeoScopeInput, GeoWindowInput } from "../types/geo";
import type {
  GeoPersona,
  GeoPersonaGenerateResponse,
  GeoPersonaGeneration,
  GeoPersonaMemoryRow,
  GeoPersonaResultsResponse,
  GeoPersonaActivityResponse,
  GeoPersonaRow,
  GeoPersonasResponse,
  GeoPersonaUpdateInput,
  PersonaGenerationContext,
} from "../types/geo-personas";
import {
  hasGeoPersonaDetailsChanged,
  normalizeGeneratedPersonaSet,
} from "../utils/geo-personas";
import { buildPersonaGenerationPrompt } from "../utils/persona-generation-prompt";
import { geoDb, geoSkip } from "./effect";
import {
  GeoPersonaGenerateError,
  GeoPersonaLimitError,
  GeoPersonaNotFoundError,
  GeoWriterCreditsExhaustedError,
} from "./errors";
import { lockGeoProject } from "./lock";
import { toGeoPersona } from "./mappers";
import { geoCheckScope, requireGeoProject, resolveGeoScope } from "./projects";
import { startClaimedGeoScanRun } from "./scan-handoff";
import { claimGeoScanRun } from "./scan-status";

const loadPersonaRows = Effect.fn("geo.personas.load")(function* (
  projectId: string,
  database: Pick<typeof db, "query"> = db,
  includeArchived = false
) {
  const rows = yield* geoDb("personas lookup failed", () =>
    database.query.geoPersonas.findMany({
      where: includeArchived
        ? eq(geoPersonas.projectId, projectId)
        : and(
            eq(geoPersonas.projectId, projectId),
            isNull(geoPersonas.archivedAt)
          ),
      orderBy: includeArchived
        ? [desc(geoPersonas.archivedAt), asc(geoPersonas.createdAt)]
        : [asc(geoPersonas.createdAt)],
    })
  );
  const memories = yield* geoDb("persona memories lookup failed", () =>
    rows.length === 0
      ? Promise.resolve([] as GeoPersonaMemoryRow[])
      : database.query.geoPersonaMemories.findMany({
          where: inArray(
            geoPersonaMemories.personaId,
            rows.map((row) => row.id)
          ),
          orderBy: [asc(geoPersonaMemories.createdAt)],
        })
  );
  return toPersonas(rows, memories);
});

function toPersonas(
  rows: readonly GeoPersonaRow[],
  memories: readonly GeoPersonaMemoryRow[]
): GeoPersona[] {
  const byPersona = new Map<string, GeoPersonaMemoryRow[]>();
  for (const memory of memories) {
    const entries = byPersona.get(memory.personaId) ?? [];
    entries.push(memory);
    byPersona.set(memory.personaId, entries);
  }
  return rows.map((row) => toGeoPersona(row, byPersona.get(row.id) ?? []));
}

export const listGeoPersonas = Effect.fn("geo.personasList")(function* (
  input: GeoScopeInput
) {
  const scope = yield* resolveGeoScope(input);
  if (!scope.projectId) {
    const empty: GeoPersonasResponse = { configured: false, personas: [] };
    return empty;
  }
  const personas = yield* loadPersonaRows(scope.projectId, db, true);
  const response: GeoPersonasResponse = { configured: true, personas };
  return response;
});

export const requireGeoPersonaGenerationCapacity = Effect.fn(
  "geo.personas.capacity"
)(function* (input: GeoScopeInput, personaId?: string, brief?: string) {
  const scope = yield* requireGeoProject(input);
  if (personaId) {
    return scope;
  }
  const current = yield* geoDb("persona count lookup failed", () =>
    db
      .select({ count: count() })
      .from(geoPersonas)
      .where(
        and(
          eq(geoPersonas.projectId, scope.projectId),
          eq(geoPersonas.organizationId, scope.organizationId),
          isNull(geoPersonas.archivedAt)
        )
      )
  );
  const requestedCount = brief ? 1 : GEO_PERSONA_MIN_COUNT;
  if ((current.at(0)?.count ?? 0) + requestedCount > GEO_PERSONA_MAX_COUNT) {
    return yield* Effect.fail(
      new GeoPersonaLimitError({ limit: GEO_PERSONA_MAX_COUNT })
    );
  }
  return scope;
});

const loadGenerationContext = Effect.fn("geo.personas.context")(function* (
  projectId: string,
  brandSettingsId: string
) {
  const [brand, settings, competitors, prompts, sitemaps] = yield* Effect.all([
    geoDb("brand identity lookup failed", () =>
      db.query.brandSettings.findFirst({
        columns: {
          companyName: true,
          companyDescription: true,
          audience: true,
          websiteUrl: true,
        },
        where: eq(brandSettings.id, brandSettingsId),
      })
    ),
    geoDb("settings lookup failed", () =>
      db.query.geoSettings.findFirst({
        columns: { companyName: true },
        where: eq(geoSettings.projectId, projectId),
      })
    ),
    geoDb("competitors lookup failed", () =>
      db
        .select({ name: geoCompetitors.name })
        .from(geoCompetitors)
        .where(eq(geoCompetitors.projectId, projectId))
    ),
    geoDb("prompts lookup failed", () =>
      db
        .select({ prompt: geoPrompts.prompt })
        .from(geoPrompts)
        .where(
          and(eq(geoPrompts.projectId, projectId), eq(geoPrompts.enabled, true))
        )
        .orderBy(asc(geoPrompts.createdAt))
        .limit(GEO_PERSONA_CONTEXT_PROMPT_LIMIT)
    ),
    geoDb("sitemaps lookup failed", () =>
      db
        .select({ id: brandSitemaps.id })
        .from(brandSitemaps)
        .where(eq(brandSitemaps.brandSettingsId, brandSettingsId))
    ),
  ]);

  const pages =
    sitemaps.length === 0
      ? []
      : yield* geoDb("sitemap pages lookup failed", () =>
          db
            .select({
              url: brandSitemapPages.url,
              title: brandSitemapPages.title,
            })
            .from(brandSitemapPages)
            .where(
              and(
                inArray(
                  brandSitemapPages.sitemapId,
                  sitemaps.map((sitemap) => sitemap.id)
                ),
                eq(brandSitemapPages.category, "crawled")
              )
            )
            .orderBy(desc(brandSitemapPages.wordCount))
            .limit(GEO_PERSONA_CONTEXT_PAGE_LIMIT)
        );

  const context: PersonaGenerationContext = {
    companyName:
      settings?.companyName?.trim() ||
      brand?.companyName?.trim() ||
      "the company",
    websiteUrl: brand?.websiteUrl ?? null,
    companyDescription: brand?.companyDescription ?? null,
    audience: brand?.audience ?? null,
    competitors: competitors.map((competitor) => competitor.name),
    pages,
    prompts: prompts.map((row) => row.prompt),
  };
  return context;
});

const generatePersonaSet = Effect.fn("geo.personas.generate")(function* (
  organizationId: string,
  context: PersonaGenerationContext,
  target?: GeoPersona,
  peers: GeoPersona[] = [],
  brief?: string,
  promptsOnly = false
) {
  const result = yield* Effect.tryPromise({
    try: (signal) =>
      generateText({
        model: gateway(GEO_PERSONA_GENERATION_MODEL, { organizationId }),
        providerOptions: { gateway: { tags: ["geo-persona-generation"] } },
        output: Output.object({
          schema:
            target || brief
              ? geoPersonaRegenerationSchema
              : geoPersonaGenerationSchema,
        }),
        system: GEO_PERSONA_GENERATION_SYSTEM_PROMPT,
        prompt: buildPersonaGenerationPrompt(
          context,
          target,
          peers,
          brief,
          promptsOnly
        ),
        maxOutputTokens: GEO_PERSONA_GENERATION_MAX_TOKENS,
        abortSignal: signal,
      }),
    catch: (cause) =>
      new GeoPersonaGenerateError({
        message: "Failed to generate personas",
        cause,
      }),
  });
  const generation: GeoPersonaGeneration = normalizeGeneratedPersonaSet(
    result.output
  );
  const usage: AgentTokenUsage = toAgentTokenUsage(result.usage);
  return { generation, usage };
});

/**
 * Adds generated personas atomically. Regenerating a single target replaces
 * only that row, preserving its current scan setting within the transaction.
 */
export const persistGeneratedPersonas = Effect.fn("geo.personas.persist")(
  function* (
    organizationId: string,
    projectId: string,
    generation: GeoPersonaGeneration,
    target?: GeoPersona,
    promptsOnly = false
  ) {
    const now = new Date();
    const personaRows: (typeof geoPersonas.$inferInsert)[] = [];
    const memoryRows: (typeof geoPersonaMemories.$inferInsert)[] = [];
    for (const persona of generation.personas) {
      const personaId = target?.id ?? crypto.randomUUID();
      personaRows.push({
        id: personaId,
        organizationId,
        projectId,
        name: persona.name,
        role: persona.role,
        company: persona.company,
        summary: persona.summary,
        searchStyle: persona.searchStyle,
        conversationPrompts: persona.conversationPrompts,
        profile: {
          goals: persona.goals,
          painPoints: persona.painPoints,
          currentStack: persona.currentStack,
          buyingTriggers: persona.buyingTriggers,
          objections: persona.objections,
        },
        enabled: target?.enabled ?? true,
        createdAt: now,
      });
      for (const memory of persona.memories) {
        memoryRows.push({
          id: crypto.randomUUID(),
          personaId,
          organizationId,
          projectId,
          kind: memory.kind,
          content: memory.content,
          createdAt: now,
        });
      }
    }

    const persisted = yield* geoDb("personas persist failed", () =>
      db.transaction(async (tx) => {
        await Effect.runPromise(lockGeoProject(tx, projectId));
        if (!target) {
          const current = await tx
            .select({ count: count() })
            .from(geoPersonas)
            .where(
              and(
                eq(geoPersonas.projectId, projectId),
                eq(geoPersonas.organizationId, organizationId),
                isNull(geoPersonas.archivedAt)
              )
            );
          if (
            (current.at(0)?.count ?? 0) + personaRows.length >
            GEO_PERSONA_MAX_COUNT
          ) {
            return null;
          }
        }
        if (target) {
          const replacement = personaRows.at(0);
          if (!replacement || personaRows.length !== 1) {
            throw new GeoPersonaGenerateError({
              message: "Expected one replacement persona",
            });
          }
          const replacementFields = promptsOnly
            ? { conversationPrompts: replacement.conversationPrompts }
            : {
                name: replacement.name,
                role: replacement.role,
                company: replacement.company,
                summary: replacement.summary,
                searchStyle: replacement.searchStyle,
                conversationPrompts: replacement.conversationPrompts,
                profile: replacement.profile,
              };
          const updated = await tx
            .update(geoPersonas)
            .set({
              ...replacementFields,
              updatedAt: now,
            })
            .where(
              and(
                eq(geoPersonas.projectId, projectId),
                eq(geoPersonas.organizationId, organizationId),
                eq(geoPersonas.id, target.id),
                isNull(geoPersonas.archivedAt),
                eq(geoPersonas.name, target.name),
                eq(geoPersonas.role, target.role),
                eq(geoPersonas.company, target.company),
                eq(geoPersonas.summary, target.summary),
                eq(geoPersonas.searchStyle, target.searchStyle),
                eq(geoPersonas.profile, target.profile),
                eq(geoPersonas.conversationPrompts, target.conversationPrompts)
              )
            )
            .returning({ id: geoPersonas.id });
          if (updated.length !== 1) {
            return null;
          }
          if (!promptsOnly) {
            await tx
              .delete(geoPersonaMemories)
              .where(eq(geoPersonaMemories.personaId, target.id));
          }
        } else {
          await tx.insert(geoPersonas).values(personaRows);
        }
        if (!promptsOnly) {
          await tx.insert(geoPersonaMemories).values(memoryRows);
        }
        return Effect.runPromise(loadPersonaRows(projectId, tx));
      })
    );
    if (!persisted) {
      if (target) {
        return yield* Effect.fail(
          new GeoPersonaGenerateError({
            message: "Persona changed while generation was in progress",
          })
        );
      }
      return yield* Effect.fail(
        new GeoPersonaLimitError({ limit: GEO_PERSONA_MAX_COUNT })
      );
    }
    return persisted;
  }
);

/**
 * Builds a fresh persona set for the project from its brand profile,
 * competitors, crawled pages, and tracked prompts, then adds it to the project.
 * An explicit personaId regenerates only that persona. Charged against AI credits.
 */
export const generateGeoPersonas = Effect.fn("geo.personasGenerate")(function* (
  input: GeoScopeInput,
  personaId?: string,
  brief?: string,
  promptsOnly = false
) {
  const billing = yield* GeoContentBillingService;
  const scope = yield* requireGeoProject(input);
  const existing = yield* loadPersonaRows(scope.projectId);
  const target = existing.find((persona) => persona.id === personaId);
  if (personaId && !target) {
    return yield* Effect.fail(new GeoPersonaNotFoundError({ personaId }));
  }
  if (promptsOnly && !target) {
    return yield* Effect.fail(
      new GeoPersonaGenerateError({
        message: "A persona is required when generating prompts only",
      })
    );
  }
  const requestedCount = brief ? 1 : GEO_PERSONA_MIN_COUNT;
  if (!target && existing.length + requestedCount > GEO_PERSONA_MAX_COUNT) {
    return yield* Effect.fail(
      new GeoPersonaLimitError({ limit: GEO_PERSONA_MAX_COUNT })
    );
  }
  const context = yield* loadGenerationContext(
    scope.projectId,
    scope.brandSettingsId
  );
  const settings = yield* geoDb("settings lookup failed", () =>
    db.query.geoSettings.findFirst({
      columns: { enabled: true },
      where: eq(geoSettings.projectId, scope.projectId),
    })
  );

  const runId = `${GEO_PERSONA_GENERATION_TRIGGER_ID}-${crypto.randomUUID()}`;
  const gate = yield* billing
    .gateContentBilling({
      organizationId: scope.organizationId,
      executionId: runId,
      outputType: null,
      countTowardQuota: false,
      allowPlanIncluded: true,
    })
    .pipe(
      Effect.mapError(
        (cause) =>
          new GeoPersonaGenerateError({
            message: "Failed to reserve AI credits",
            cause,
          })
      )
    );
  if (!gate.allowed) {
    return yield* Effect.fail(
      new GeoWriterCreditsExhaustedError({
        message: describeContentBillingDenial(gate),
      })
    );
  }

  const settle = (action: "confirm" | "release", usage?: AgentTokenUsage) =>
    billing
      .finalizeContentBilling({
        reservation: gate,
        action,
        usage,
        fallbackModelId: GEO_PERSONA_GENERATION_MODEL,
        properties: {
          source: "geo_personas_generate",
          run_id: runId,
          project_id: scope.projectId,
          markup_applied: gate.useMarkup,
        },
        logPrefix: "GeoPersonas",
      })
      .pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            console.error(`[GeoPersonas] billing ${action} failed:`, error);
          })
        )
      );

  const generated = yield* generatePersonaSet(
    scope.organizationId,
    context,
    target,
    existing.filter((persona) => persona.id !== personaId),
    brief,
    promptsOnly
  ).pipe(Effect.tapError(() => settle("release")));

  const personas = yield* persistGeneratedPersonas(
    scope.organizationId,
    scope.projectId,
    generated.generation,
    target,
    promptsOnly
  ).pipe(Effect.tapError(() => settle("release")));

  // The set is committed at this point, so the credits are spent no matter
  // what happens while building the response below.
  yield* settle("confirm", generated.usage);

  // Personas only produce results inside a scan, so a fresh set kicks one off
  // right away when the project scans at all. An existing scan keeps its frozen
  // plan; new personas will be picked up by the next project scan.
  if (settings?.enabled) {
    const claim = yield* claimGeoScanRun(scope.projectId).pipe(
      geoSkip("scan claim failed")
    );
    if (claim) {
      yield* startClaimedGeoScanRun(
        scope.organizationId,
        scope.projectId,
        claim.claimedAt
      ).pipe(
        Effect.catch((error) => {
          console.error("[GEO] Failed to start scan after personas:", error);
          return Effect.void;
        })
      );
    }
  }

  const response: GeoPersonaGenerateResponse = { personas };
  return response;
});

export const updateGeoPersona = Effect.fn("geo.personaUpdate")(function* (
  input: GeoScopeInput,
  update: GeoPersonaUpdateInput
) {
  const scope = yield* requireGeoProject(input);
  const existing = yield* geoDb("persona lookup failed", () =>
    db.query.geoPersonas.findFirst({
      with: {
        memories: {
          orderBy: [
            asc(geoPersonaMemories.createdAt),
            asc(geoPersonaMemories.id),
          ],
        },
      },
      where: and(
        eq(geoPersonas.id, update.personaId),
        eq(geoPersonas.organizationId, scope.organizationId),
        eq(geoPersonas.projectId, scope.projectId),
        isNull(geoPersonas.archivedAt)
      ),
    })
  );
  if (!existing) {
    return yield* Effect.fail(
      new GeoPersonaNotFoundError({ personaId: update.personaId })
    );
  }
  const current = toGeoPersona(existing, existing.memories);
  const detailsChanged = update.details
    ? hasGeoPersonaDetailsChanged(current, update.details)
    : false;
  const enabledChanged =
    update.enabled !== undefined && update.enabled !== existing.enabled;
  if (!(detailsChanged || enabledChanged)) {
    return current;
  }
  const rows = yield* geoDb("persona update failed", () =>
    db
      .update(geoPersonas)
      .set({
        ...(enabledChanged ? { enabled: update.enabled } : {}),
        ...(detailsChanged ? update.details : {}),
        ...(detailsChanged ? { conversationPrompts: [] } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(geoPersonas.id, update.personaId),
          eq(geoPersonas.organizationId, scope.organizationId),
          eq(geoPersonas.projectId, scope.projectId),
          isNull(geoPersonas.archivedAt)
        )
      )
      .returning()
  );
  const row = rows.at(0);
  if (!row) {
    return yield* Effect.fail(
      new GeoPersonaNotFoundError({ personaId: update.personaId })
    );
  }
  return toGeoPersona(row, existing.memories);
});

export const deleteGeoPersona = Effect.fn("geo.personaDelete")(function* (
  input: GeoScopeInput,
  personaId: string
) {
  const scope = yield* requireGeoProject(input);
  const now = new Date();
  const rows = yield* geoDb("persona archive failed", () =>
    db
      .update(geoPersonas)
      .set({ archivedAt: now, enabled: false, updatedAt: now })
      .where(
        and(
          eq(geoPersonas.id, personaId),
          eq(geoPersonas.organizationId, scope.organizationId),
          eq(geoPersonas.projectId, scope.projectId),
          isNull(geoPersonas.archivedAt)
        )
      )
      .returning({ id: geoPersonas.id })
  );
  if (!rows.at(0)) {
    return yield* Effect.fail(new GeoPersonaNotFoundError({ personaId }));
  }
  return { success: true };
});

export const restoreGeoPersona = Effect.fn("geo.personaRestore")(function* (
  input: GeoScopeInput,
  personaId: string
) {
  const scope = yield* requireGeoProject(input);
  const now = new Date();
  const result = yield* geoDb("persona restore failed", () =>
    db.transaction(async (tx) => {
      await Effect.runPromise(lockGeoProject(tx, scope.projectId));
      const archived = await tx.query.geoPersonas.findFirst({
        columns: { id: true },
        where: and(
          eq(geoPersonas.id, personaId),
          eq(geoPersonas.organizationId, scope.organizationId),
          eq(geoPersonas.projectId, scope.projectId),
          isNotNull(geoPersonas.archivedAt)
        ),
      });
      if (!archived) {
        return { status: "missing" as const };
      }
      const current = await tx
        .select({ count: count() })
        .from(geoPersonas)
        .where(
          and(
            eq(geoPersonas.projectId, scope.projectId),
            eq(geoPersonas.organizationId, scope.organizationId),
            isNull(geoPersonas.archivedAt)
          )
        );
      if ((current.at(0)?.count ?? 0) >= GEO_PERSONA_MAX_COUNT) {
        return { status: "limit" as const };
      }
      const [row] = await tx
        .update(geoPersonas)
        .set({ archivedAt: null, enabled: false, updatedAt: now })
        .where(
          and(
            eq(geoPersonas.id, personaId),
            eq(geoPersonas.organizationId, scope.organizationId),
            eq(geoPersonas.projectId, scope.projectId),
            isNotNull(geoPersonas.archivedAt)
          )
        )
        .returning();
      if (!row) {
        return { status: "missing" as const };
      }
      const memories = await tx.query.geoPersonaMemories.findMany({
        where: eq(geoPersonaMemories.personaId, row.id),
        orderBy: [asc(geoPersonaMemories.createdAt)],
      });
      return {
        status: "restored" as const,
        persona: toGeoPersona(row, memories),
      };
    })
  );
  if (result.status === "missing") {
    return yield* Effect.fail(new GeoPersonaNotFoundError({ personaId }));
  }
  if (result.status === "limit") {
    return yield* Effect.fail(
      new GeoPersonaLimitError({ limit: GEO_PERSONA_MAX_COUNT })
    );
  }
  return result.persona;
});

export const loadGeoPersonaResults = Effect.fn("geo.personaResults")(function* (
  input: GeoScopeInput,
  personaId: string | undefined,
  scanId?: string
) {
  const scope = yield* resolveGeoScope(input);
  const scans = personaId
    ? yield* geoDb("persona scan history query failed", () =>
        queryGeoCheckPersonaScans(geoCheckScope(scope), personaId)
      )
    : [];
  const selectedScanId =
    scanId && scans.some((scan) => scan.scanId === scanId)
      ? scanId
      : (scans.at(0)?.scanId ?? null);
  const rows = yield* geoDb("persona results query failed", () =>
    queryGeoCheckPersonaResults(
      geoCheckScope(scope),
      personaId,
      selectedScanId ?? undefined
    )
  );
  const response: GeoPersonaResultsResponse = {
    results: rows.map((row) => ({
      scanId: row.scanId,
      personaId: row.personaId,
      personaSnapshot: row.personaSnapshot,
      turn: row.turn,
      engine: row.engine,
      prompt: row.prompt,
      answer: row.answer,
      mentioned: row.mentioned,
      position: row.position,
      sentiment: row.sentiment,
      excerpt: row.excerpt,
      searchQueries: row.grounding.queries,
      sources:
        row.grounding.sources.length > 0
          ? row.grounding.sources
          : row.sources.map((source) => ({
              title: source.title ?? source.url,
              url: source.url,
              domain: "",
            })),
      finishReason: row.finishReason,
      promptTokens: row.promptTokens,
      outputTokens: row.outputTokens,
      reasoningTokens: row.reasoningTokens,
      truncated: row.truncated,
      lastCheckedAt: row.lastCheckedAt.toISOString(),
    })),
    scans: scans.map((scan) => ({
      id: scan.scanId,
      capturedAt: scan.capturedAt.toISOString(),
    })),
    selectedScanId,
  };
  return response;
});

export const loadGeoPersonaActivity = Effect.fn("geo.personaActivity")(
  function* (input: GeoScopeInput & GeoWindowInput) {
    const scope = yield* resolveGeoScope(input);
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(
      from.getUTCDate() - (input.days ?? GEO_PERSONA_ACTIVITY_DAYS) + 1
    );
    const to = new Date();
    to.setUTCHours(24, 0, 0, 0);
    const window = toGeoCheckWindow(input);
    const rangeFrom = input.from && window?.from ? window.from : from;
    const rangeTo = window?.toExclusive ?? to;
    const rows = yield* geoDb("persona activity query failed", () =>
      queryGeoCheckPersonaActivity(geoCheckScope(scope), rangeFrom, rangeTo)
    );
    const response: GeoPersonaActivityResponse = {
      from: rangeFrom.toISOString().slice(0, 10),
      to: rangeTo.toISOString().slice(0, 10),
      points: rows.flatMap((row) =>
        row.personaId && row.snapshotVersion
          ? [
              {
                ...row,
                personaId: row.personaId,
                snapshotVersion: row.snapshotVersion,
                lastCheckedAt: row.lastCheckedAt.toISOString(),
              },
            ]
          : []
      ),
    };
    return response;
  }
);
