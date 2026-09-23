import { gateway } from "@notra/ai/gateway";
import { scrapeWebsiteForBrandAnalysis } from "@notra/ai/utils/context-dev";
import { db } from "@notra/db/drizzle";
import { geoSettings, projects } from "@notra/db/schema";
import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_DISCOVERY_ALIAS_LIMIT,
  GEO_DISCOVERY_CACHE_PREFIX,
  GEO_DISCOVERY_CACHE_TTL_SECONDS,
  GEO_DISCOVERY_COMPETITOR_LIMIT,
  GEO_DISCOVERY_CONVERSATIONS,
  GEO_DISCOVERY_MAX_ALIASES,
  GEO_DISCOVERY_MAX_COMPETITORS,
  GEO_DISCOVERY_MAX_PROMPTS,
  GEO_DISCOVERY_MAX_TOKENS,
  GEO_DISCOVERY_MIN_COMPETITORS,
  GEO_DISCOVERY_MIN_PROMPTS,
  GEO_DISCOVERY_MODEL,
  GEO_DISCOVERY_SYSTEM_PROMPT,
  GEO_GAP_TITLE_MAX_LENGTH,
  GEO_PROMPT_MAX_LENGTH,
  GEO_PROMPT_MIN_LENGTH,
  GEO_TRACKED_PROMPT_VOICE,
} from "../constants/geo";
import { geoWebsiteDiscoverySchema } from "../schemas/geo";
import type { DbTransaction } from "../types/db";
import type {
  GeoCompetitorSeed,
  GeoDiscoverWebsiteResult,
  GeoGenerateFromWebsiteResult,
  GeoGeneratedConversation,
  GeoPromptInsert,
  GeoScopeInput,
  GeoWebsiteDiscovery,
} from "../types/geo";
import { geoConversationRules } from "../utils/conversation-generation-prompt";
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
import { ensureGeoProject } from "./projects";
import { startClaimedGeoScanRun } from "./scan-handoff";
import { claimGeoScanRun } from "./scan-status";
import {
  insertGeneratedConversationsIfEmpty,
  normalizeGeneratedConversations,
} from "./sequence-generation";
import { buildBrandTerms, promptMentionsBrand } from "./suggestion-keywords";

const MIN_PROMPT_LENGTH = GEO_PROMPT_MIN_LENGTH;
const MAX_PROMPT_LENGTH = GEO_PROMPT_MAX_LENGTH;

function buildDiscoveryPrompt(url: string, content: string): string {
  const year = new Date().getFullYear();
  return `Website: ${url}

Website content:
"""
${content}
"""

Derive the brand tracking configuration for this company:

1. companyName: the company or product name exactly as it brands itself.
2. aliases: up to ${GEO_DISCOVERY_MAX_ALIASES} alternative spellings that identify this company - product names, the bare domain, and common misspellings. Never include generic words that could refer to anything else.
3. competitors: between ${GEO_DISCOVERY_MIN_COMPETITORS} and ${GEO_DISCOVERY_MAX_COMPETITORS} real, named companies or products that compete in the same category. For each one give its name and its bare website domain (for example "stripe.com"), or null for domain when you are not sure.
4. audienceType: who pays this company, judged by its own buyers and never by the industry it serves. "technical" when the buyers are developers, engineers or AI-native teams who deliberately choose which AI model they use (developer tools, APIs, infrastructure, AI products). "commerce" when consumers find it by searching Google for something to buy, book or visit (online shops, consumer products, restaurants, travel, local businesses and trades). "general" for everyone else (professional services, non-technical B2B, media, education), whose buyers just use whatever model their assistant ships with. Software or services sold to shops, restaurants or other businesses are "general" or "technical", not "commerce": a store builder or an email tool for merchants is "general".
5. prompts: between ${GEO_DISCOVERY_MIN_PROMPTS} and ${GEO_DISCOVERY_MAX_PROMPTS} entries, each with a "prompt" and a "title".
6. conversations: exactly ${GEO_DISCOVERY_CONVERSATIONS} multi-turn conversations, each with a "name" and "steps" (the messages in order). Follow the conversation rules below.

Before writing prompts, picture three or four different people who would end up buying from this company (their job, company size, stage, budget, what they are struggling with today). Write the prompts those specific people would type, spread across the set.

Prompt rules:
- ${GEO_TRACKED_PROMPT_VOICE}
- Cover these intents across the set:
  - 4 or 5 recommendation prompts: someone looking for something to solve this problem, each from a different angle (role, budget, stack, scale, stage, region).
  - 3 problem-first prompts: describe the pain or the task in the words a person would use, without naming any tool category ("my transactional emails keep landing in spam, what am i doing wrong").
  - 2 comparison or alternative prompts built on the competitors you listed, phrased the way a person would ("is mailchimp worth it or should i just use something simpler", "switching away from hubspot, what are people using now"). Never compare against the company itself.
  - 1 or 2 evaluation prompts: how to choose, what it should cost, or whether they need a dedicated tool at all.
- Never mention the company name, product name, domain, or any alias. Not even once. Never copy taglines, feature names, coined terms, or marketing copy from the website. Do not explain what the company is.
- Use the words "tool", "software", "platform" or "solution" in at most 4 prompts; real people often describe the outcome instead.
- Write every prompt in the language the website's audience speaks (a German website gets German prompts). Never mix languages within a prompt. Do not append "${year}".
- Each prompt must be between ${MIN_PROMPT_LENGTH} and ${MAX_PROMPT_LENGTH} characters.

Title rules:
- The title is the headline of the article that would win this prompt: specific, publishable and in Title Case, following proven formats such as "Best {Category} Tools in ${year}: {Facets} Compared", "Best {Competitor} Alternatives for {Use Case}", "{A} vs {B}: Features, Pricing & Which to Choose", "How to {Task} (Step-by-Step)", or "What Is {Term}? Definition, Examples & How to Measure It".
- Use "${year}" only in ranking or comparison titles, never in how-to or definition titles.
- Write titles in the same language as the prompt and keep each under ${GEO_GAP_TITLE_MAX_LENGTH} characters.

${geoConversationRules("the company")}`;
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

const prepareGeoWebsiteGeneration = Effect.fn(
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
  const brandTerms = buildBrandTerms({ companyName, aliases });
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
  content: string
) {
  const result = yield* Effect.tryPromise({
    try: () =>
      generateText({
        model: gateway(GEO_DISCOVERY_MODEL, {
          organizationId,
        }),
        providerOptions: { gateway: { tags: ["geo-discovery"] } },
        output: Output.object({ schema: geoWebsiteDiscoverySchema }),
        prompt: buildDiscoveryPrompt(url, content),
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

function discoveryCacheKey(organizationId: string, url: string): string {
  return `${GEO_DISCOVERY_CACHE_PREFIX}:${organizationId}:${url}`;
}

export const discoverGeoWebsite = Effect.fn("geo.discoverWebsite")(function* (
  organizationId: string,
  url: string
) {
  const cacheKey = discoveryCacheKey(organizationId, url);
  const cached = yield* readGeoCache(cacheKey, geoWebsiteDiscoverySchema);
  if (cached) {
    const result: GeoDiscoverWebsiteResult = { url, discovery: cached };
    return result;
  }
  const content = yield* scrapeWebsite(url);
  const discovery = yield* extractDiscovery(organizationId, url, content);
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
)(function* (
  tx: DbTransaction,
  organizationId: string,
  projectId: string,
  companyName: string,
  aliases: string[],
  entries: readonly GeoPromptInsert[],
  conversations: readonly GeoGeneratedConversation[],
  discoveredCompetitors: readonly GeoCompetitorSeed[],
  seedEngines: string[] | null
) {
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
    (current) =>
      buildCompetitorSeeds(
        unionValues(
          current.map((competitor) => competitor.name),
          discoveredCompetitors.map((entry) => entry.name),
          GEO_DISCOVERY_COMPETITOR_LIMIT
        ),
        discoveredCompetitors
      ),
    GEO_DISCOVERY_COMPETITOR_LIMIT
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

export const generateGeoFromWebsite = Effect.fn("geo.generateFromWebsite")(
  function* (scopeInput: GeoScopeInput, url: string) {
    const organizationId = scopeInput.organizationId;
    const { discovery } = yield* discoverGeoWebsite(organizationId, url);

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

    const existing = yield* Effect.tryPromise({
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
            persistGeoWebsiteGeneration(
              tx,
              organizationId,
              projectId,
              companyName,
              aliases,
              entries,
              conversations,
              discovery.competitors,
              seedEngines
            )
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
  url: string
) {
  const { discovery } = yield* discoverGeoWebsite(organizationId, url);
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
          persistGeoWebsiteGeneration(
            tx,
            organizationId,
            row.id,
            companyName,
            aliases,
            entries,
            conversations,
            discovery.competitors,
            seedEngines
          )
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
