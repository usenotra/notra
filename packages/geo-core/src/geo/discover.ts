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
  GeoPromptInsert,
  GeoScopeInput,
  GeoWebsiteDiscovery,
} from "../types/geo";
import { readGeoCache, writeGeoCache } from "./cache";
import { competitorKey, normalizeCompetitorDomain } from "./domain";
import { geoSkip } from "./effect";
import { GeoDiscoveryError } from "./errors";
import { invalidateGeoIngestHostsCache } from "./ingest-hosts-cache";
import { toGeoProject } from "./mappers";
import {
  insertPromptsInTransaction,
  reconcileCompetitorsInTransaction,
} from "./programs";
import { ensureGeoProject } from "./projects";
import { startClaimedGeoScanRun } from "./scan-handoff";
import { claimGeoScanRun } from "./scan-status";
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
4. prompts: between ${GEO_DISCOVERY_MIN_PROMPTS} and ${GEO_DISCOVERY_MAX_PROMPTS} entries, each with a "prompt" and a "title".

Prompt rules:
- A prompt is the exact text a real buyer would type into ChatGPT while researching this category - before they know this company exists. ${GEO_TRACKED_PROMPT_VOICE}
- Never mention the company name, product name, domain, or any alias. Not even once. Competitor names are allowed only in alternatives or comparison prompts, still in the same lowercase voice ("what's a good hootsuite alternative").
- Never copy taglines, product descriptions, or marketing copy from the website into a prompt. Do not explain what the company is.
- Never concatenate keywords, never mix languages within a prompt, and never write anything you would not plausibly type yourself.
- Cover different intents across the set in that same voice: what tools to use, how to do a task, what to compare, what a competitor alternative is. Do not append "${year}".
- Each prompt must be between ${MIN_PROMPT_LENGTH} and ${MAX_PROMPT_LENGTH} characters.

Title rules:
- The title is the headline of the article that would win this prompt: specific, publishable and in Title Case, following proven formats such as "Best {Category} Tools in ${year}: {Facets} Compared", "Best {Competitor} Alternatives for {Use Case} in ${year}", "{A} vs {B}: Features, Pricing & Which to Choose in ${year}", "{Product} Pricing: Plans & Cost Breakdown for ${year}", "How to {Task} (Step-by-Step ${year})", or "What Is {Term}? Definition, Examples & How to Measure It".
- Write titles in the same language as the prompt and keep each under ${GEO_GAP_TITLE_MAX_LENGTH} characters.`;
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

  return { aliases, companyName, entries };
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
        output: Output.object({ schema: geoWebsiteDiscoverySchema }),
        prompt: buildDiscoveryPrompt(url, content),
        system: GEO_DISCOVERY_SYSTEM_PROMPT,
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

const persistGeoWebsiteGeneration = Effect.fn(
  "geo.generateFromWebsite.persist"
)(function* (
  tx: DbTransaction,
  organizationId: string,
  projectId: string,
  companyName: string,
  aliases: string[],
  entries: readonly GeoPromptInsert[],
  discoveredCompetitors: readonly GeoCompetitorSeed[]
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

  const summary: GeoGenerateFromWebsiteResult = {
    companyName,
    aliases,
    competitors: competitorOutcome.competitors.map(
      (competitor) => competitor.name
    ),
    promptsAdded: inserted.length,
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

    const { aliases, companyName, entries } =
      yield* prepareGeoWebsiteGeneration(
        discovery,
        existing?.companyName,
        existing?.aliases
      );

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
              discovery.competitors
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
  const { aliases, companyName, entries } =
    yield* prepareGeoWebsiteGeneration(discovery);

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
            discovery.competitors
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
