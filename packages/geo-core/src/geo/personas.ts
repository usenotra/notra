import { describeContentBillingDenial } from "@notra/ai/billing/content-billing";
import { gateway } from "@notra/ai/gateway";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { PersonaMemoryRecord } from "@notra/ai/types/geo-personas";
import {
  deletePersonaMemories,
  upsertPersonaMemories,
} from "@notra/ai/utils/persona-memory";
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
import { queryGeoCheckPersonaResults } from "@notra/db/utils/geo-checks";
import { generateText, Output } from "ai";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_PERSONA_CONTEXT_PAGE_LIMIT,
  GEO_PERSONA_CONTEXT_PROMPT_LIMIT,
  GEO_PERSONA_GENERATION_MAX_TOKENS,
  GEO_PERSONA_GENERATION_MODEL,
  GEO_PERSONA_GENERATION_SYSTEM_PROMPT,
  GEO_PERSONA_GENERATION_TRIGGER_ID,
  GEO_PERSONA_MAX_COUNT,
  GEO_PERSONA_MAX_MEMORIES,
  GEO_PERSONA_MIN_COUNT,
  GEO_PERSONA_MIN_MEMORIES,
} from "../constants/geo-personas";
import { GeoContentBillingService } from "../deps";
import { geoPersonaGenerationSchema } from "../schemas/geo-personas";
import type { GeoScopeInput } from "../types/geo";
import type {
  GeoPersona,
  GeoPersonaGenerateResponse,
  GeoPersonaGeneration,
  GeoPersonaMemoryRow,
  GeoPersonaResultsResponse,
  GeoPersonaRow,
  GeoPersonasResponse,
  GeoPersonaUpdateInput,
} from "../types/geo-personas";
import { normalizeGeneratedPersonaSet } from "../utils/geo-personas";
import { geoDb, geoSkip } from "./effect";
import {
  GeoPersonaGenerateError,
  GeoPersonaNotFoundError,
  GeoWriterCreditsExhaustedError,
} from "./errors";
import { lockGeoProject } from "./lock";
import { toGeoPersona } from "./mappers";
import { geoCheckScope, requireGeoProject, resolveGeoScope } from "./projects";
import { startClaimedGeoScanRun } from "./scan-handoff";
import { claimGeoScanRun } from "./scan-status";

interface PersonaGenerationContext {
  companyName: string;
  websiteUrl: string | null;
  companyDescription: string | null;
  audience: string | null;
  competitors: string[];
  pages: { url: string; title: string | null }[];
  prompts: string[];
}

function bulletList(items: readonly string[]): string {
  return items.length > 0
    ? items.map((item) => `- ${item}`).join("\n")
    : "- (none known)";
}

function buildPersonaGenerationPrompt(
  context: PersonaGenerationContext
): string {
  return `Company: ${context.companyName}
Website: ${context.websiteUrl ?? "unknown"}

What the company does:
${context.companyDescription ?? "(no description on file)"}

Who the company says it sells to:
${context.audience ?? "(not specified)"}

Competitors it tracks:
${bulletList(context.competitors)}

Pages on its website (title and url):
${bulletList(context.pages.map((page) => `${page.title ?? "(untitled)"} — ${page.url}`))}

Questions it already tracks in AI assistants:
${bulletList(context.prompts)}

Create between ${GEO_PERSONA_MIN_COUNT} and ${GEO_PERSONA_MAX_COUNT} ideal customer profiles for this company. Each one is a specific person who would realistically open ChatGPT, Perplexity, or Claude to research the category this company plays in. They do not know this company yet.

Rules for each persona:
- name: a realistic full name matching the likely market and language of the company.
- role: their job title. company: the kind of company they work at, with size and industry, for example "45-person B2B SaaS startup, fintech".
- summary: two to four short key points about their situation and why they are researching now. Return a single string with one point per newline, without bullet markers. Use concise phrases, not a paragraph.
- searchStyle: short key points covering how they type into AI chats: tone, length, jargon, and details they always include. Return a single string with one point per newline, without bullet markers.
- goals, painPoints, currentStack, buyingTriggers, objections: concise, concrete phrases, one idea per item, not full paragraphs or generic phrases. Keep profile points brief and put supporting detail in memories. currentStack must name real tools they plausibly use today, including at least one tracked competitor or adjacent tool where that fits.
- memories: between ${GEO_PERSONA_MIN_MEMORIES} and ${GEO_PERSONA_MAX_MEMORIES} first-person facts this person would remember. Use kind "background" for career and company facts, "experience" for specific things that happened with tools or vendors, "preference" for how they like to work and buy, and "constraint" for budget, compliance, or team limits. Each memory is one or two sentences, specific enough that the person could refer back to it in a conversation.

Make the personas clearly different from each other in seniority, company size, urgency, and the angle from which they enter the category. Never mention ${context.companyName} inside a persona; they have not heard of it yet.`;
}

const loadPersonaRows = Effect.fn("geo.personas.load")(function* (
  projectId: string
) {
  const rows = yield* geoDb("personas lookup failed", () =>
    db.query.geoPersonas.findMany({
      where: eq(geoPersonas.projectId, projectId),
      orderBy: [asc(geoPersonas.createdAt)],
    })
  );
  const memories = yield* geoDb("persona memories lookup failed", () =>
    rows.length === 0
      ? Promise.resolve([] as GeoPersonaMemoryRow[])
      : db.query.geoPersonaMemories.findMany({
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
  const personas = yield* loadPersonaRows(scope.projectId);
  const response: GeoPersonasResponse = { configured: true, personas };
  return response;
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
  context: PersonaGenerationContext
) {
  const result = yield* Effect.tryPromise({
    try: (signal) =>
      generateText({
        model: gateway(GEO_PERSONA_GENERATION_MODEL, { organizationId }),
        output: Output.object({ schema: geoPersonaGenerationSchema }),
        system: GEO_PERSONA_GENERATION_SYSTEM_PROMPT,
        prompt: buildPersonaGenerationPrompt(context),
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
  const usage: AgentTokenUsage = {
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
    totalTokens: result.usage.totalTokens ?? 0,
    cacheReadTokens: result.usage.inputTokenDetails?.cacheReadTokens ?? 0,
    cacheWriteTokens: result.usage.inputTokenDetails?.cacheWriteTokens ?? 0,
  };
  return { generation, usage };
});

/**
 * Swaps the project's persona set inside one transaction. The project lock
 * serializes concurrent generations so the second one replaces the first
 * instead of leaving two sets behind; the delete therefore has to happen
 * inside the locked transaction rather than from a snapshot taken before it.
 */
const replacePersonas = Effect.fn("geo.personas.replace")(function* (
  organizationId: string,
  projectId: string,
  generation: GeoPersonaGeneration
) {
  const now = new Date();
  const personaRows: (typeof geoPersonas.$inferInsert)[] = [];
  const memoryRows: (typeof geoPersonaMemories.$inferInsert)[] = [];
  for (const persona of generation.personas) {
    const personaId = crypto.randomUUID();
    personaRows.push({
      id: personaId,
      organizationId,
      projectId,
      name: persona.name,
      role: persona.role,
      company: persona.company,
      summary: persona.summary,
      searchStyle: persona.searchStyle,
      profile: {
        goals: persona.goals,
        painPoints: persona.painPoints,
        currentStack: persona.currentStack,
        buyingTriggers: persona.buyingTriggers,
        objections: persona.objections,
      },
      enabled: true,
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

  const removed = yield* geoDb("personas replace failed", () =>
    db.transaction(async (tx) => {
      await Effect.runPromise(lockGeoProject(tx, projectId));
      const deleted = await tx
        .delete(geoPersonas)
        .where(eq(geoPersonas.projectId, projectId))
        .returning({ id: geoPersonas.id });
      await tx.insert(geoPersonas).values(personaRows);
      await tx.insert(geoPersonaMemories).values(memoryRows);
      return deleted;
    })
  );

  // Vector cleanup and indexing are best effort: the memories live in
  // Postgres and the persona agent falls back to keyword search.
  yield* Effect.tryPromise({
    try: async () => {
      await Promise.all(removed.map((row) => deletePersonaMemories(row.id)));
      const records: PersonaMemoryRecord[] = memoryRows.map((row) => ({
        id: row.id ?? "",
        personaId: row.personaId,
        projectId,
        kind: row.kind,
        content: row.content,
      }));
      await upsertPersonaMemories(records);
    },
    catch: (cause) => cause,
  }).pipe(
    Effect.catch((error) =>
      Effect.sync(() => {
        console.error("[GEO] persona vector index sync failed:", error);
      })
    )
  );
});

/**
 * Builds a fresh persona set for the project from its brand profile,
 * competitors, crawled pages, and tracked prompts, then replaces whatever was
 * there. Charged against AI credits like a writer plan.
 */
export const generateGeoPersonas = Effect.fn("geo.personasGenerate")(function* (
  input: GeoScopeInput
) {
  const billing = yield* GeoContentBillingService;
  const scope = yield* requireGeoProject(input);
  const context = yield* loadGenerationContext(
    scope.projectId,
    scope.brandSettingsId
  );

  const runId = `${GEO_PERSONA_GENERATION_TRIGGER_ID}-${crypto.randomUUID()}`;
  const gate = yield* billing
    .gateContentBilling({
      organizationId: scope.organizationId,
      executionId: runId,
      outputType: null,
      countTowardQuota: false,
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
    context
  ).pipe(Effect.tapError(() => settle("release")));

  yield* replacePersonas(
    scope.organizationId,
    scope.projectId,
    generated.generation
  ).pipe(Effect.tapError(() => settle("release")));

  // The set is committed at this point, so the credits are spent no matter
  // what happens while building the response below.
  yield* settle("confirm", generated.usage);

  const personas = yield* loadPersonaRows(scope.projectId);

  // Personas only produce results inside a scan, so a fresh set kicks one off
  // right away when the project scans at all. Losing the claim means a scan is
  // already running; it will pick the new personas up on its next batch plan.
  const settings = yield* geoDb("settings lookup failed", () =>
    db.query.geoSettings.findFirst({
      columns: { enabled: true },
      where: eq(geoSettings.projectId, scope.projectId),
    })
  );
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
  const rows = yield* geoDb("persona update failed", () =>
    db
      .update(geoPersonas)
      .set({
        ...(update.enabled === undefined ? {} : { enabled: update.enabled }),
      })
      .where(
        and(
          eq(geoPersonas.id, update.personaId),
          eq(geoPersonas.organizationId, scope.organizationId),
          eq(geoPersonas.projectId, scope.projectId)
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
  const memories = yield* geoDb("persona memories lookup failed", () =>
    db.query.geoPersonaMemories.findMany({
      where: eq(geoPersonaMemories.personaId, row.id),
      orderBy: [asc(geoPersonaMemories.createdAt)],
    })
  );
  return toGeoPersona(row, memories);
});

export const deleteGeoPersona = Effect.fn("geo.personaDelete")(function* (
  input: GeoScopeInput,
  personaId: string
) {
  const scope = yield* requireGeoProject(input);
  const rows = yield* geoDb("persona delete failed", () =>
    db
      .delete(geoPersonas)
      .where(
        and(
          eq(geoPersonas.id, personaId),
          eq(geoPersonas.organizationId, scope.organizationId),
          eq(geoPersonas.projectId, scope.projectId)
        )
      )
      .returning({ id: geoPersonas.id })
  );
  if (!rows.at(0)) {
    return yield* Effect.fail(new GeoPersonaNotFoundError({ personaId }));
  }
  yield* Effect.tryPromise({
    try: () => deletePersonaMemories(personaId),
    catch: (cause) => cause,
  }).pipe(
    Effect.catch((error) =>
      Effect.sync(() => {
        console.error("[GEO] persona vector delete failed:", error);
      })
    )
  );
  return { success: true };
});

export const loadGeoPersonaResults = Effect.fn("geo.personaResults")(function* (
  input: GeoScopeInput,
  personaId: string | undefined
) {
  const scope = yield* resolveGeoScope(input);
  const rows = yield* geoDb("persona results query failed", () =>
    queryGeoCheckPersonaResults(geoCheckScope(scope), personaId)
  );
  const response: GeoPersonaResultsResponse = {
    results: rows.map((row) => ({
      personaId: row.personaId,
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
  };
  return response;
});
