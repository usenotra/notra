import { DEFAULT_LANGUAGE } from "@notra/ai/constants/languages";
import { gateway } from "@notra/ai/gateway";
import { scrapeWebsiteForBrandAnalysis } from "@notra/ai/utils/context-dev";
import { db } from "@notra/db/drizzle";
import { geoSettings, projects } from "@notra/db/schema";
import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_DISCOVERY_ALIAS_LIMIT,
  GEO_DISCOVERY_CACHE_TTL_SECONDS,
  GEO_DISCOVERY_COMPETITOR_LIMIT,
  GEO_MAX_COMPETITORS,
  GEO_DISCOVERY_CONVERSATIONS,
  GEO_DISCOVERY_MAX_ALIASES,
  GEO_DISCOVERY_MAX_COMPETITORS,
  GEO_DISCOVERY_MAX_PROMPTS,
  GEO_DISCOVERY_MAX_TOKENS,
  GEO_DISCOVERY_MIN_PROMPTS,
  GEO_WEBSITE_DISCOVERY_MODEL,
  GEO_DISCOVERY_SYSTEM_PROMPT,
  GEO_GAP_TITLE_MAX_LENGTH,
  GEO_PROMPT_MAX_LENGTH,
  GEO_PROMPT_MIN_LENGTH,
} from "../constants/geo";
import { geoWebsiteDiscoverySchema } from "../schemas/geo";
import type { DbTransaction } from "../types/db";
import type {
  GeoCompetitorSeed,
  GeoDiscoverWebsiteResult,
  GeoGenerateFromWebsiteResult,
  GeoPromptInsert,
  GeoScopeInput,
  GeoWebsiteDiscovery,
  GeoWebsiteGenerationWrite,
} from "../types/geo";
import { geoConversationRules } from "../utils/conversation-generation-prompt";
import { geoDiscoveryCacheKey } from "../utils/geo-discovery-cache";
import { trackedGeoLanguages } from "../utils/geo-language-rows";
import { geoEnginesForAudience } from "../utils/geo-model-catalog";
import { readGeoCache, writeGeoCache } from "./cache";
import { competitorKey, normalizeCompetitorDomain } from "./domain";
import { geoSkip } from "./effect";
import { GeoDiscoveryError } from "./errors";
import { invalidateGeoIngestHostsCache } from "./ingest-hosts-cache";
import { toGeoProject } from "./mappers";
import { loadGeoModelCatalog } from "./model-catalog";
import {
  insertPromptsInTransaction,
  reconcileCompetitorsInTransaction,
} from "./programs";
import { ensureGeoProject, resolveGeoScope } from "./projects";
import { startClaimedGeoScanRun } from "./scan-handoff";
import { claimGeoScanRun } from "./scan-status";
import {
  insertGeneratedConversationsIfEmpty,
  normalizeGeneratedConversations,
} from "./sequence-generation";
import { buildBrandTerms, promptMentionsBrand } from "./suggestion-keywords";

const MIN_PROMPT_LENGTH = GEO_PROMPT_MIN_LENGTH;
const MAX_PROMPT_LENGTH = GEO_PROMPT_MAX_LENGTH;

function buildDiscoveryPrompt(
  url: string,
  content: string,
  language: string
): string {
  const year = new Date().getFullYear();
  return `Website: ${url}

Website content:
"""
${content}
"""

Return:
- companyName: the name used on the site.
- aliases: up to ${GEO_DISCOVERY_MAX_ALIASES} specific names, spellings or domains for this company. No generic terms.
- competitors: up to ${GEO_DISCOVERY_MAX_COMPETITORS} real products that replace this one. An integration, sponsor or underlying provider is not a competitor. For an SDK, list other SDKs, not the services it connects to. Include a bare domain only when sure; otherwise use null. Zero competitors is fine.
- audienceType: "technical" for developer tools, APIs, infrastructure and AI products bought by technical teams; "commerce" for products or services consumers buy, book or visit; "general" for other buyers. Classify the buyer, not the industry they serve. Software sold to shops is not "commerce".
- prompts: ${GEO_DISCOVERY_MIN_PROMPTS} to ${GEO_DISCOVERY_MAX_PROMPTS} distinct buyer questions, each with a "prompt" and "title". Fewer is fine for a narrow product.
- conversations: exactly ${GEO_DISCOVERY_CONVERSATIONS} conversations with a "name" and ordered "steps". Follow the rules below.

Write questions someone would actually type into ChatGPT before finding this company. Use their words, not SEO phrases. Ask for options or a way forward; a complaint alone is not enough. Write questions before titles.
- Start with 2 short questions for 6 or 7 prompts, or 3 or 4 for 8 to 10. Keep them around 40 to 90 characters, each about a specific need this product solves. Write a similar number around 90 to 170 characters with one useful detail. Use the remaining slots for longer questions when buyers have real constraints to explain. Don't add a backstory to fill space.
- Stay at this product's level. A provider-agnostic email library can answer questions about switching or using multiple providers, not which provider to buy, how to fix deliverability or how to schedule sends. A social SDK is not a post scheduler. If this product would not be a direct answer, replace the question.
- Cover different jobs. No more than two questions about the same problem; changing the provider, role or opener does not make a new question. Mix recommendations with practical questions and tradeoffs.
- Never name this company, its products, aliases or domain in a prompt. Do not copy its wording. Mention a direct competitor only when a buyer would naturally compare it.
- Write every prompt in ${language}, even when the website uses another language. Do not invent claims about prices, legal deadlines, features or release dates. Each prompt must be ${MIN_PROMPT_LENGTH} to ${MAX_PROMPT_LENGTH} characters; do not append "${year}".

Give each question a useful article title in ${language}, under ${GEO_GAP_TITLE_MAX_LENGTH} characters. Use natural capitalization for that language. Only ranking or comparison titles may include "${year}".

${geoConversationRules("the company", language)}`;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function unionValues(
  existing: string[],
  extracted: string[],
  limit: number
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const value of [...existing, ...extracted]) {
    const trimmed = value.trim();
    const key = normalizeKey(trimmed);
    if (!trimmed || seen.has(key) || merged.length >= limit) {
      continue;
    }
    seen.add(key);
    merged.push(trimmed);
  }
  return merged;
}

function buildCompetitorSeeds(
  names: string[],
  discovered: readonly GeoCompetitorSeed[]
): GeoCompetitorSeed[] {
  const domains = new Map<string, string | null>();
  for (const entry of discovered) {
    const domain = entry.domain
      ? normalizeCompetitorDomain(entry.domain)
      : null;
    domains.set(competitorKey(entry.name), domain);
  }
  return names.map((name) => ({
    name,
    domain: domains.get(competitorKey(name)) ?? null,
  }));
}

export const prepareGeoWebsiteGeneration = Effect.fn(
  "geo.generateFromWebsite.prepare"
)(function* (
  discovery: GeoWebsiteDiscovery,
  existingCompanyName?: string,
  existingAliases: string[] = []
) {
  const aliases = unionValues(
    existingAliases,
    discovery.aliases,
    GEO_DISCOVERY_ALIAS_LIMIT
  );
  const companyName = existingCompanyName ?? discovery.companyName;
  const brandTerms = buildBrandTerms({
    companyName: discovery.companyName,
    aliases: [companyName, ...existingAliases, ...discovery.aliases],
  });
  const entries: GeoPromptInsert[] = [];

  for (const entry of discovery.prompts) {
    const prompt = entry.prompt.trim();
    const title = entry.title.trim().slice(0, GEO_GAP_TITLE_MAX_LENGTH);
    if (
      prompt.length < MIN_PROMPT_LENGTH ||
      prompt.length > MAX_PROMPT_LENGTH ||
      promptMentionsBrand(prompt, brandTerms)
    ) {
      continue;
    }
    entries.push({ prompt, title: title.length > 0 ? title : null });
  }

  if (entries.length === 0) {
    return yield* Effect.fail(
      new GeoDiscoveryError({
        message: "Website analysis did not produce any usable prompts",
      })
    );
  }

  const conversations = normalizeGeneratedConversations(
    discovery.conversations,
    brandTerms,
    GEO_DISCOVERY_CONVERSATIONS
  );

  return { aliases, companyName, entries, conversations };
});

const scrapeWebsite = Effect.fn("geo.discover.scrape")(function* (url: string) {
  const result = yield* Effect.tryPromise({
    try: () => scrapeWebsiteForBrandAnalysis(url),
    catch: (cause) =>
      new GeoDiscoveryError({ message: "Failed to scrape the website", cause }),
  });

  if (!result.success) {
    return yield* Effect.fail(new GeoDiscoveryError({ message: result.error }));
  }

  return result.content;
});

const extractDiscovery = Effect.fn("geo.discover.extract")(function* (
  organizationId: string,
  url: string,
  content: string,
  language: string
) {
  const result = yield* Effect.tryPromise({
    try: () =>
      generateText({
        model: gateway(GEO_WEBSITE_DISCOVERY_MODEL, {
          organizationId,
        }),
        providerOptions: { gateway: { tags: ["geo-discovery"] } },
        output: Output.object({ schema: geoWebsiteDiscoverySchema }),
        prompt: buildDiscoveryPrompt(url, content, language),
        instructions: GEO_DISCOVERY_SYSTEM_PROMPT,
        maxOutputTokens: GEO_DISCOVERY_MAX_TOKENS,
      }),
    catch: (cause) =>
      new GeoDiscoveryError({
        message: "Failed to analyze the website",
        cause,
      }),
  });

  const discovery: GeoWebsiteDiscovery = result.output;
  return discovery;
});

export const discoverGeoWebsite = Effect.fn("geo.discoverWebsite")(function* (
  organizationId: string,
  url: string,
  fresh = false,
  language: string = DEFAULT_LANGUAGE
) {
  const cacheKey = geoDiscoveryCacheKey(organizationId, url, language);
  const cached = fresh
    ? null
    : yield* readGeoCache(cacheKey, geoWebsiteDiscoverySchema);
  if (cached) {
    const result: GeoDiscoverWebsiteResult = { url, discovery: cached };
    return result;
  }
  const content = yield* scrapeWebsite(url);
  const discovery = yield* extractDiscovery(
    organizationId,
    url,
    content,
    language
  );
  yield* writeGeoCache(cacheKey, discovery, GEO_DISCOVERY_CACHE_TTL_SECONDS);
  const result: GeoDiscoverWebsiteResult = { url, discovery };
  return result;
});

/**
 * Engines a newly created settings row starts with. Technical brands stay on
 * null so they keep following the default set.
 */
const resolveSeedEngines = Effect.fn("geo.discover.seedEngines")(function* (
  organizationId: string,
  discovery: GeoWebsiteDiscovery
) {
  if (discovery.audienceType === "technical") {
    return null;
  }
  const catalog = yield* loadGeoModelCatalog(organizationId);
  return geoEnginesForAudience(catalog, discovery.audienceType);
});

const persistGeoWebsiteGeneration = Effect.fn(
  "geo.generateFromWebsite.persist"
)(function* (tx: DbTransaction, input: GeoWebsiteGenerationWrite) {
  const {
    organizationId,
    projectId,
    companyName,
    aliases,
    entries,
    conversations,
    discoveredCompetitors,
    seedEngines,
    seedLanguages,
  } = input;
  yield* Effect.tryPromise({
    try: () =>
      tx
        .insert(geoSettings)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          projectId,
          companyName,
          aliases,
          competitors: [],
          // Only a new row is seeded; an existing selection is left alone.
          engines: seedEngines,
          languages: seedLanguages ? [...seedLanguages] : null,
          promptLanguage: seedLanguages?.at(0) ?? null,
          enabled: true,
        })
        .onConflictDoUpdate({
          target: geoSettings.projectId,
          set: { companyName, aliases },
        }),
    catch: (cause) =>
      new GeoDiscoveryError({
        message: "Failed to save GEO settings",
        cause,
      }),
  });

  const competitorOutcome = yield* reconcileCompetitorsInTransaction(
    tx,
    organizationId,
    projectId,
    // Discovery only tops a project up to its own limit; competitors that
    // are already tracked (e.g. a CSV import) are never dropped.
    (current) =>
      buildCompetitorSeeds(
        unionValues(
          current.map((competitor) => competitor.name),
          discoveredCompetitors.map((entry) => entry.name),
          Math.max(current.length, GEO_DISCOVERY_COMPETITOR_LIMIT)
        ),
        discoveredCompetitors
      ),
    GEO_MAX_COMPETITORS
  );
  if (competitorOutcome.status === "limit") {
    return yield* Effect.fail(
      new GeoDiscoveryError({
        message: "Website analysis produced too many competitors",
      })
    );
  }

  const inserted = yield* insertPromptsInTransaction(
    tx,
    organizationId,
    projectId,
    entries
  );

  const conversationsAdded = yield* Effect.tryPromise({
    try: () =>
      insertGeneratedConversationsIfEmpty(
        tx,
        organizationId,
        projectId,
        conversations
      ),
    catch: (cause) =>
      new GeoDiscoveryError({
        message: "Failed to save generated conversations",
        cause,
      }),
  });

  const summary: GeoGenerateFromWebsiteResult = {
    companyName,
    aliases,
    competitors: competitorOutcome.competitors.map(
      (competitor) => competitor.name
    ),
    promptsAdded: inserted.length,
    conversationsAdded,
  };
  return summary;
});

const startGeoScanAfterWebsiteGeneration = Effect.fn(
  "geo.generateFromWebsite.startScan"
)(function* (organizationId: string, projectId: string, scanEnabled: boolean) {
  if (!scanEnabled) {
    return;
  }

  // Take the same atomic claim every other trigger takes, rather than
  // stamping a start blindly. The stamp is what the dashboard reads as
  // "Scanning…", and writing it without owning the slot both lied about a
  // scan that a concurrent trigger is already running and overwrote the
  // token that run needs to release it. Losing the claim means a scan is
  // already in flight for this project — its results are what onboarding
  // is waiting for anyway, so start nothing.
  const claim = yield* claimGeoScanRun(projectId).pipe(
    geoSkip("scan claim failed")
  );
  if (claim) {
    yield* startClaimedGeoScanRun(
      organizationId,
      projectId,
      claim.claimedAt
    ).pipe(
      Effect.catch((error) => {
        console.error(
          "[GEO] Failed to start scan after website generate:",
          error
        );
        return Effect.void;
      })
    );
  }
});

const loadExistingSettings = (projectId: string) =>
  Effect.tryPromise({
    try: () =>
      db.query.geoSettings.findFirst({
        where: eq(geoSettings.projectId, projectId),
      }),
    catch: (cause) =>
      new GeoDiscoveryError({
        message: "Failed to load GEO settings",
        cause,
      }),
  });

export const generateGeoFromWebsite = Effect.fn("geo.generateFromWebsite")(
  function* (scopeInput: GeoScopeInput, url: string) {
    const organizationId = scopeInput.organizationId;
    // The project `ensureGeoProject` settles on (the oldest when none is
    // given) decides the prompt language, so resolve it before discovery.
    const scope = yield* resolveGeoScope(scopeInput).pipe(
      Effect.mapError(
        (cause) =>
          new GeoDiscoveryError({
            message: "Failed to resolve the project",
            cause,
          })
      )
    );
    const existing = scope.projectId
      ? yield* loadExistingSettings(scope.projectId)
      : undefined;
    const { discovery } = yield* discoverGeoWebsite(
      organizationId,
      url,
      true,
      existing?.promptLanguage ?? DEFAULT_LANGUAGE
    );

    const projectId = yield* ensureGeoProject(
      scopeInput,
      discovery.companyName
    ).pipe(
      Effect.catchTags({
        GeoDatabaseError: (error) =>
          Effect.fail(
            new GeoDiscoveryError({
              message: "Failed to resolve the project",
              cause: error,
            })
          ),
        GeoProjectCreateFailedError: (error) =>
          Effect.fail(
            new GeoDiscoveryError({
              message: "Failed to create the project",
              cause: error,
            })
          ),
        GeoProjectNotFoundError: (error) =>
          Effect.fail(
            new GeoDiscoveryError({
              message: "Project not found",
              cause: error,
            })
          ),
      })
    );

    const { aliases, companyName, entries, conversations } =
      yield* prepareGeoWebsiteGeneration(
        discovery,
        existing?.companyName,
        existing?.aliases
      );

    const seedEngines = yield* resolveSeedEngines(organizationId, discovery);

    const summary = yield* Effect.tryPromise({
      try: () =>
        db.transaction((tx) =>
          Effect.runPromise(
            persistGeoWebsiteGeneration(tx, {
              organizationId,
              projectId,
              companyName,
              aliases,
              entries,
              conversations,
              discoveredCompetitors: discovery.competitors,
              seedEngines,
              seedLanguages: null,
            })
          )
        ),
      catch: (cause) =>
        new GeoDiscoveryError({
          message: "Failed to save GEO tracking",
          cause,
        }),
    });

    // Newly created settings default to enabled; an existing disabled row is
    // left alone so we never stamp a scan start that the scan will skip.
    yield* startGeoScanAfterWebsiteGeneration(
      organizationId,
      projectId,
      existing?.enabled ?? true
    );

    return summary;
  }
);

export const createGeoProjectFromWebsite = Effect.fn(
  "geo.projectCreateFromWebsite"
)(function* (
  organizationId: string,
  name: string,
  brandSettingsId: string,
  url: string,
  languages?: readonly string[]
) {
  const seedLanguages = languages?.length
    ? trackedGeoLanguages(languages)
    : null;
  const { discovery } = yield* discoverGeoWebsite(
    organizationId,
    url,
    true,
    seedLanguages?.at(0) ?? DEFAULT_LANGUAGE
  );
  const { aliases, companyName, entries, conversations } =
    yield* prepareGeoWebsiteGeneration(discovery);
  const seedEngines = yield* resolveSeedEngines(organizationId, discovery);

  const project = yield* Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const rows = await tx
          .insert(projects)
          .values({
            id: crypto.randomUUID(),
            organizationId,
            name: name.trim(),
            brandSettingsId,
          })
          .returning();
        const row = rows.at(0);
        if (!row) {
          throw new Error("Project insert returned no row");
        }

        await Effect.runPromise(
          persistGeoWebsiteGeneration(tx, {
            organizationId,
            projectId: row.id,
            companyName,
            aliases,
            entries,
            conversations,
            discoveredCompetitors: discovery.competitors,
            seedEngines,
            seedLanguages,
          })
        );
        return toGeoProject(row);
      }),
    catch: (cause) =>
      new GeoDiscoveryError({
        message: "Failed to create and configure the project",
        cause,
      }),
  });

  yield* Effect.promise(() =>
    invalidateGeoIngestHostsCache(organizationId, project.id)
  );
  yield* startGeoScanAfterWebsiteGeneration(organizationId, project.id, true);
  return project;
});
