import {
  ingestGeoTrafficEvents,
  isTinybirdConfigured,
} from "@notra/analytics/tinybird/client";
import type { GeoTrafficEventRow } from "@notra/analytics/tinybird/datasources";
import { purgeGeoProjectData } from "@notra/analytics/tinybird/purge";
import { toClickHouseDateTime } from "@notra/analytics/utils/datetime";
import { EMPTY_GEO_CHECK_GROUNDING } from "@notra/db/constants/geo-checks";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  geoPromptSequences,
  geoPrompts,
  geoScans,
  geoSettings,
  organizations,
  projects,
} from "@notra/db/schema";
import type {
  GeoCheckGrounding,
  GeoCheckSource,
  GeoCheckWrite,
} from "@notra/db/types/geo-checks";
import { bumpGeoCheckGeneration } from "@notra/db/utils/geo-check-cache";
import { insertGeoMentionChecks } from "@notra/db/utils/geo-checks";
import { isDemoMode } from "@notra/utils/demo-mode";
import { and, asc, desc, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_EXCERPT_MAX_LENGTH,
  GEO_OPENCODE_ENGINE_ID,
  GEO_SAMPLE_DATA_ENABLED,
} from "../constants/geo";
import {
  GEO_SAMPLE_CRAWLERS,
  GEO_SAMPLE_DEFAULT_PROFILE,
  GEO_SAMPLE_ENGINES,
  GEO_SAMPLE_GROUNDED_ENGINES,
  GEO_SAMPLE_LANGUAGES,
  GEO_SAMPLE_REFERRALS,
  GEO_SAMPLE_SEARCH_ENGINES,
  GEO_SAMPLE_SEARCH_QUERY_MAX,
  GEO_SAMPLE_SEARCH_QUERY_MIN,
  GEO_SAMPLE_SEARCH_QUERY_SUFFIXES,
  GEO_SAMPLE_SOURCE_MAX,
  GEO_SAMPLE_SOURCE_MIN,
} from "../constants/geo-sample";
import type {
  GeoSampleDataClearResponse,
  GeoSampleDataResponse,
  GeoScopeInput,
} from "../types/geo";
import type { GeoSampleProfile, GeoSampleSeedInput } from "../types/geo-sample";
import { hashInt, unit } from "../utils/geo-sample-hash";
import { competitorKey } from "./domain";
import { geoDb } from "./effect";
import {
  GeoBrandIdentityMissingError,
  GeoProjectCreateFailedError,
  GeoSampleDataDisabledError,
  GeoTinybirdError,
} from "./errors";
import { insertGeoPrompts, reconcileGeoCompetitors } from "./programs";
import { customPromptScanId } from "./prompts";

const INGEST_CHUNK_SIZE = 250;

interface GeoSampleScan {
  id: string;
  startedAt: Date;
  finishedAt: Date;
}
const SENTIMENTS = ["positive", "neutral", "negative"] as const;
const COUNTRIES = ["US", "DE", "GB", "FR"] as const;
const MAX_JUDGE_COMPETITORS = 4;
const TREND_GAIN = 0.12;
const SCAN_DURATION_MS = 60_000;
/** Keeps "today 09:41" from landing in the future when seeded earlier. */
const FUTURE_CLAMP_MS = 7 * 60_000;
const DAY_MS = 86_400_000;

function pick<T>(items: readonly T[], seed: string): T {
  const item = items[hashInt(seed) % items.length];
  if (!item) {
    throw new Error("Cannot pick from an empty list");
  }
  return item;
}

/** Days since the Unix epoch of the UTC day `daysAgo` days before `now`. */
function epochDay(now: Date, daysAgo: number): number {
  return Math.floor(now.getTime() / DAY_MS) - daysAgo;
}

function utcDay(now: Date, daysAgo: number, hours: number, minutes: number) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  const seconds = hashInt(`${epochDay(now, daysAgo)}-${hours}`) % 50;
  date.setUTCHours(hours, minutes, seconds, 0);
  if (date.getTime() > now.getTime()) {
    return new Date(now.getTime() - FUTURE_CLAMP_MS);
  }
  return date;
}

function competitorNames(profile: GeoSampleProfile): string[] {
  return profile.competitors.map((competitor) => competitor.name);
}

function mentionedCompetitors(
  seed: string,
  companyName: string,
  profile: GeoSampleProfile
): string[] {
  const names = competitorNames(profile).filter(
    (name) => competitorKey(name) !== competitorKey(companyName)
  );
  if (names.length === 0) {
    return [];
  }
  const count = 2 + (hashInt(seed) % (MAX_JUDGE_COMPETITORS - 1));
  const offset = hashInt(`${seed}-offset`) % names.length;
  return Array.from({ length: Math.min(count, names.length) }, (_, index) => {
    const name = names[(offset + index) % names.length];
    return name ?? names[0] ?? "";
  }).filter((name) => name.length > 0);
}

function rangeCount(seed: string, min: number, max: number): number {
  return min + (hashInt(seed) % (max - min + 1));
}

function sampleSearchQueries(seed: string, prompt: string): string[] {
  const base = prompt
    .trim()
    .replace(/[?.!]+$/u, "")
    .toLowerCase();
  const count = rangeCount(
    `${seed}-queries`,
    GEO_SAMPLE_SEARCH_QUERY_MIN,
    GEO_SAMPLE_SEARCH_QUERY_MAX
  );
  const offset =
    hashInt(`${seed}-suffix`) % GEO_SAMPLE_SEARCH_QUERY_SUFFIXES.length;
  const queries = [base];
  for (let index = 1; index < count; index++) {
    const suffix =
      GEO_SAMPLE_SEARCH_QUERY_SUFFIXES[
        (offset + index) % GEO_SAMPLE_SEARCH_QUERY_SUFFIXES.length
      ];
    queries.push(`${base} ${suffix}`);
  }
  return queries;
}

function sampleSources(
  seed: string,
  pool: readonly GeoCheckSource[]
): GeoCheckGrounding["sources"] {
  const count = rangeCount(
    `${seed}-sources`,
    GEO_SAMPLE_SOURCE_MIN,
    Math.min(GEO_SAMPLE_SOURCE_MAX, pool.length)
  );
  const offset = hashInt(`${seed}-source-offset`) % pool.length;
  return Array.from({ length: count }, (_, index) => {
    const source = pool[(offset + index) % pool.length];
    return source ? { ...source } : null;
  }).filter((source) => source !== null);
}

function sampleGrounding(
  seed: string,
  engine: string,
  prompt: string,
  profile: GeoSampleProfile
): GeoCheckGrounding {
  if (engine === GEO_OPENCODE_ENGINE_ID) {
    return {
      queries: sampleSearchQueries(seed, prompt),
      sources: [...profile.codingAgentSources],
    };
  }
  if (!GEO_SAMPLE_SEARCH_ENGINES.includes(engine)) {
    return EMPTY_GEO_CHECK_GROUNDING;
  }
  return {
    queries: sampleSearchQueries(seed, prompt),
    sources: sampleSources(seed, profile.sources),
  };
}

function mentionRateFor(
  engineRate: number,
  dayIndex: number,
  days: number
): number {
  const progress = days <= 1 ? 1 : dayIndex / (days - 1);
  return Math.min(0.92, engineRate + progress * TREND_GAIN);
}

function joinNames(names: readonly string[], language: string): string {
  const conjunction = language === "German" ? "und" : "and";
  if (names.length <= 1) {
    return names[0] ?? "";
  }
  return `${names.slice(0, -1).join(", ")} ${conjunction} ${names.at(-1)}`;
}

function buildExcerpt(input: {
  profile: GeoSampleProfile;
  companyName: string;
  mentioned: boolean;
  language: string;
  competitors: readonly string[];
}): string {
  const { excerpts } = input.profile;
  const german = input.language === "German";
  let template = german ? excerpts.missingGerman : excerpts.missing;
  if (input.mentioned) {
    template = german ? excerpts.mentionedGerman : excerpts.mentioned;
  }
  return template
    .replaceAll("{brand}", input.companyName)
    .replaceAll("{competitors}", joinNames(input.competitors, input.language));
}

function buildMentionRow(input: {
  organizationId: string;
  projectId: string;
  scanId: string;
  engine: string;
  promptId: string;
  sequenceId: string;
  turn: number;
  prompt: string;
  capturedAt: Date;
  companyName: string;
  language: string;
  mentionRate: number;
  profile: GeoSampleProfile;
}): GeoCheckWrite {
  const seed = `${input.scanId}:${input.engine}:${input.promptId}:${input.turn}:${input.language}`;
  const mentioned = unit(seed) < input.mentionRate;
  const position = mentioned ? 1 + (hashInt(`${seed}-pos`) % 5) : null;
  const sentiment = mentioned ? pick(SENTIMENTS, `${seed}-sentiment`) : null;
  const competitors = mentionedCompetitors(
    seed,
    input.companyName,
    input.profile
  );

  const excerpt = buildExcerpt({
    profile: input.profile,
    companyName: input.companyName,
    mentioned,
    language: input.language,
    competitors,
  }).slice(0, GEO_EXCERPT_MAX_LENGTH);

  return {
    organizationId: input.organizationId,
    projectId: input.projectId,
    scanId: input.scanId,
    engine: input.engine,
    promptId: input.promptId,
    sequenceId: input.sequenceId || null,
    turn: input.turn,
    prompt: input.prompt,
    answer: excerpt,
    capturedAt: input.capturedAt,
    mentioned,
    ownedSourceCited: false,
    position,
    sentiment,
    competitors,
    excerpt,
    grounding: sampleGrounding(seed, input.engine, input.prompt, input.profile),
    language: input.language,
    finishReason: null,
    promptTokens: null,
    outputTokens: null,
    reasoningTokens: null,
  };
}

function buildMentionChecks(input: {
  organizationId: string;
  projectId: string;
  companyName: string;
  prompts: readonly { id: string; english: string; german: string }[];
  sequences: readonly {
    id: string;
    steps: readonly string[];
  }[];
  now: Date;
  profile: GeoSampleProfile;
}): { scans: GeoSampleScan[]; checks: GeoCheckWrite[] } {
  const rows: GeoCheckWrite[] = [];
  const scans: GeoSampleScan[] = [];
  const { profile } = input;

  for (let daysAgo = profile.days - 1; daysAgo >= 0; daysAgo--) {
    const dayIndex = profile.days - 1 - daysAgo;
    const captured = utcDay(input.now, daysAgo, 9, 41);
    const capturedAt = captured;
    const scanId = crypto.randomUUID();
    scans.push({
      id: scanId,
      startedAt: new Date(captured.getTime() - SCAN_DURATION_MS),
      finishedAt: captured,
    });

    for (const engine of profile.engines ?? GEO_SAMPLE_ENGINES) {
      const rate = mentionRateFor(engine.mentionRate, dayIndex, profile.days);
      for (const prompt of input.prompts) {
        rows.push(
          buildMentionRow({
            organizationId: input.organizationId,
            projectId: input.projectId,
            scanId,
            engine: engine.engine,
            promptId: customPromptScanId(prompt.id),
            sequenceId: "",
            turn: 0,
            prompt: prompt.english,
            capturedAt,
            companyName: input.companyName,
            language: "English",
            mentionRate: rate,
            profile,
          })
        );

        if (profile.germanChecks !== false && daysAgo % 2 === 0) {
          rows.push(
            buildMentionRow({
              organizationId: input.organizationId,
              projectId: input.projectId,
              scanId,
              engine: engine.engine,
              promptId: customPromptScanId(prompt.id),
              sequenceId: "",
              turn: 0,
              prompt: prompt.german,
              capturedAt,
              companyName: input.companyName,
              language: "German",
              mentionRate: rate * 0.85,
              profile,
            })
          );
        }
      }
    }

    for (const sequence of input.sequences) {
      for (const engine of GEO_SAMPLE_GROUNDED_ENGINES.filter(
        (grounded) =>
          !profile.engines ||
          profile.engines.some((candidate) => candidate.engine === grounded)
      )) {
        const rate = mentionRateFor(0.55, dayIndex, profile.days);
        sequence.steps.forEach((step, index) => {
          rows.push(
            buildMentionRow({
              organizationId: input.organizationId,
              projectId: input.projectId,
              scanId,
              engine,
              promptId: `sequence-${sequence.id}`,
              sequenceId: sequence.id,
              turn: index + 1,
              prompt: step,
              capturedAt,
              companyName: input.companyName,
              language: "English",
              mentionRate: rate,
              profile,
            })
          );
        });
      }
    }
  }

  return { scans, checks: rows };
}

/**
 * Deterministic AI traffic for a sample project. Exported so the public demo
 * can build the same events at read time instead of ingesting them.
 */
export function buildGeoSampleTrafficEvents(input: {
  organizationId: string;
  projectId: string;
  now: Date;
  profile?: GeoSampleProfile;
}): GeoTrafficEventRow[] {
  const rows: GeoTrafficEventRow[] = [];
  const profile = input.profile ?? GEO_SAMPLE_DEFAULT_PROFILE;

  for (let daysAgo = profile.days - 1; daysAgo >= 0; daysAgo--) {
    // Seeded by the absolute day so the demo, which rebuilds this at read
    // time, keeps the same history and journey ids across midnight.
    const day = epochDay(input.now, daysAgo);
    (profile.crawlers ?? GEO_SAMPLE_CRAWLERS).forEach(
      (crawler, crawlerIndex) => {
        const pages = 3 + (hashInt(`${day}-${crawler.agent}`) % 4);
        const journeyId = `sample-${crawler.agent}-${day}`;
        for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
          const captured = utcDay(
            input.now,
            daysAgo,
            6 + crawlerIndex,
            pageIndex * 4
          );
          rows.push({
            organization_id: input.organizationId,
            project_id: input.projectId,
            captured_at: toClickHouseDateTime(captured),
            visitor_type: "crawler",
            source: crawler.agent,
            agent: crawler.agent,
            category: crawler.category,
            confidence: "verified",
            path: pick(profile.trafficPaths, `${journeyId}-${pageIndex}`),
            host: pick(profile.trafficHosts, `${journeyId}-${pageIndex}`),
            method: "GET",
            referer: "",
            ua: `${crawler.agent}/1.0`,
            country: pick(COUNTRIES, `${journeyId}-country`),
            language: "en-US",
            request_id: `${journeyId}-${pageIndex}`,
            journey_id: journeyId,
            wants_markdown: pageIndex % 3 === 0,
          });
        }
      }
    );

    (profile.referrals ?? GEO_SAMPLE_REFERRALS).forEach(
      (referral, referralIndex) => {
        const seed = `${day}-${referral.source}`;
        const visits = 1 + (hashInt(seed) % 3);
        for (let visitIndex = 0; visitIndex < visits; visitIndex++) {
          const captured = utcDay(
            input.now,
            daysAgo,
            14 + (visitIndex % 5),
            referralIndex * 7 + visitIndex * 3
          );
          const path = pick(profile.trafficPaths, `${seed}-${visitIndex}`);
          rows.push({
            organization_id: input.organizationId,
            project_id: input.projectId,
            captured_at: toClickHouseDateTime(captured),
            visitor_type: "ai_referral",
            source: referral.source,
            agent: "",
            category: "assistant-referral",
            confidence: "reported",
            path,
            host: pick(profile.trafficHosts, `${seed}-${visitIndex}`),
            method: "GET",
            referer: referral.referer,
            ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            country: pick(COUNTRIES, `${seed}-country`),
            language: "en-US",
            request_id: `sample-ref-${day}-${referral.source}-${visitIndex}`,
            journey_id: `sample-ref-${day}-${referral.source}-${visitIndex}`,
            wants_markdown: false,
          });
        }
      }
    );
  }

  return rows;
}

async function ingestChunks<T>(
  rows: T[],
  ingest: (batch: T[]) => Promise<unknown>
): Promise<void> {
  for (let index = 0; index < rows.length; index += INGEST_CHUNK_SIZE) {
    await ingest(rows.slice(index, index + INGEST_CHUNK_SIZE));
  }
}

export const clearGeoSampleData = Effect.fn("geo.sampleDataClear")(function* (
  input: GeoScopeInput
) {
  if (!GEO_SAMPLE_DATA_ENABLED) {
    return yield* Effect.fail(new GeoSampleDataDisabledError({}));
  }

  const sampleProject = yield* geoDb("sample project lookup failed", () =>
    db.query.projects.findFirst({
      columns: { id: true },
      where: and(
        eq(projects.organizationId, input.organizationId),
        eq(projects.isSample, true)
      ),
    })
  );
  const analyticsCleared = Boolean(sampleProject) && isTinybirdConfigured();

  if (sampleProject && analyticsCleared) {
    yield* Effect.tryPromise({
      try: () =>
        purgeGeoProjectData({
          organizationId: input.organizationId,
          projectId: sampleProject.id,
        }),
      catch: (cause) =>
        new GeoTinybirdError({ label: "sample purge failed", cause }),
    });
  }

  if (sampleProject) {
    yield* geoDb("sample project delete failed", () =>
      db
        .delete(projects)
        .where(
          and(
            eq(projects.id, sampleProject.id),
            eq(projects.organizationId, input.organizationId),
            eq(projects.isSample, true)
          )
        )
    );
  }

  if (sampleProject) {
    yield* Effect.promise(() => bumpGeoCheckGeneration([input.organizationId]));
  }

  const response: GeoSampleDataClearResponse = {
    cleared: Boolean(sampleProject),
    analyticsCleared,
  };
  return response;
});

export const seedGeoSampleData = Effect.fn("geo.sampleData")(function* (
  input: GeoSampleSeedInput
) {
  const profile = input.profile ?? GEO_SAMPLE_DEFAULT_PROFILE;
  if (!GEO_SAMPLE_DATA_ENABLED) {
    return yield* Effect.fail(new GeoSampleDataDisabledError({}));
  }

  const org = yield* geoDb("organization lookup failed", () =>
    db.query.organizations.findFirst({
      columns: { name: true, slug: true },
      where: eq(organizations.id, input.organizationId),
    })
  );

  const companyName = org?.name?.trim() || "Acme";
  const identity = yield* geoDb("brand identity lookup failed", () =>
    db.query.brandSettings.findFirst({
      columns: { id: true },
      where: eq(brandSettings.organizationId, input.organizationId),
      orderBy: [desc(brandSettings.isDefault), asc(brandSettings.createdAt)],
    })
  );
  if (!identity) {
    return yield* Effect.fail(
      new GeoBrandIdentityMissingError({ organizationId: input.organizationId })
    );
  }

  yield* clearGeoSampleData(input);
  const insertedProjects = yield* geoDb("sample project create failed", () =>
    db
      .insert(projects)
      .values({
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        name: profile.projectName,
        brandSettingsId: identity.id,
        isSample: true,
      })
      .returning({ id: projects.id })
  );
  const projectId = insertedProjects.at(0)?.id;
  if (!projectId) {
    return yield* Effect.fail(new GeoProjectCreateFailedError({}));
  }
  const now = input.now ?? new Date();
  const scanFinishedAt = now;
  const slugAliases = org?.slug && org.slug !== companyName ? [org.slug] : [];
  const aliases = profile.aliases ? [...profile.aliases] : slugAliases;
  const languages =
    profile.germanChecks === false ? ["English"] : [...GEO_SAMPLE_LANGUAGES];

  const existingSettings = yield* geoDb("settings lookup failed", () =>
    db.query.geoSettings.findFirst({
      where: eq(geoSettings.projectId, projectId),
    })
  );

  if (existingSettings) {
    yield* geoDb("settings update failed", () =>
      db
        .update(geoSettings)
        .set({
          enabled: true,
          languages:
            (existingSettings.languages?.length ?? 0) > 0
              ? existingSettings.languages
              : languages,
          // A finished scan leaves `scan_started_at` NULL (see
          // `markGeoScanFinished`); a non-null stamp here would block real
          // scans on the freshly seeded project until it went stale.
          scanStartedAt: null,
          lastScanAt: scanFinishedAt,
          domains: [...profile.trafficHosts],
        })
        .where(eq(geoSettings.projectId, projectId))
    );
  } else {
    yield* geoDb("settings insert failed", () =>
      db.insert(geoSettings).values({
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        projectId,
        companyName,
        aliases,
        competitors: competitorNames(profile),
        domains: [...profile.trafficHosts],
        languages,
        engines: profile.trackedEngines ? [...profile.trackedEngines] : null,
        enabled: true,
        lastScanAt: scanFinishedAt,
      })
    );
  }

  let competitorsAdded = 0;
  yield* reconcileGeoCompetitors(
    { organizationId: input.organizationId, projectId },
    (current) => {
      const currentKeys = new Set(
        current.map((competitor) => competitorKey(competitor.name))
      );
      const missing = profile.competitors.filter(
        (entry) => !currentKeys.has(competitorKey(entry.name))
      );
      competitorsAdded = missing.length;
      return [...current, ...missing];
    }
  );

  const existingPrompts = yield* geoDb("prompts lookup failed", () =>
    db.query.geoPrompts.findMany({
      where: eq(geoPrompts.projectId, projectId),
    })
  );
  const insertedPrompts = yield* insertGeoPrompts(
    { organizationId: input.organizationId, projectId },
    profile.prompts.map((prompt) => ({ prompt: prompt.english }))
  );

  const promptByEnglish = new Map(
    profile.prompts.map((prompt) => [prompt.english, prompt])
  );
  const promptRowsForChecks = [
    ...existingPrompts.flatMap((row) => {
      const sample = promptByEnglish.get(row.prompt);
      return sample
        ? [{ id: row.id, english: sample.english, german: sample.german }]
        : [];
    }),
    ...insertedPrompts.flatMap((row) => {
      const sample = promptByEnglish.get(row.prompt);
      return sample
        ? [{ id: row.id, english: sample.english, german: sample.german }]
        : [];
    }),
  ];

  const insertedSequences = yield* geoDb("sequences insert failed", () =>
    db
      .insert(geoPromptSequences)
      .values(
        profile.sequences.map((sequence) => ({
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          projectId,
          name: sequence.name,
          steps: [...sequence.steps],
        }))
      )
      .returning({ id: geoPromptSequences.id, name: geoPromptSequences.name })
  );
  const sequencesForChecks = insertedSequences.flatMap((row) => {
    const sequence = profile.sequences.find(
      (candidate) => candidate.name === row.name
    );
    return sequence ? [{ id: row.id, steps: sequence.steps }] : [];
  });

  const { scans, checks: mentionChecks } = buildMentionChecks({
    organizationId: input.organizationId,
    projectId,
    companyName: existingSettings?.companyName ?? companyName,
    prompts: promptRowsForChecks,
    sequences: sequencesForChecks,
    now,
    profile,
  });

  yield* geoDb("sample scans insert failed", () =>
    db.insert(geoScans).values(
      scans.map((scan) => ({
        id: scan.id,
        organizationId: input.organizationId,
        projectId,
        status: "completed" as const,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
      }))
    )
  );
  yield* geoDb("sample checks insert failed", () =>
    insertGeoMentionChecks(mentionChecks)
  );
  // The demo builds its traffic at read time (see `demo-traffic.ts`) and
  // has nowhere to ingest it.
  const demo = isDemoMode();
  const trafficEvents = demo
    ? []
    : buildGeoSampleTrafficEvents({
        organizationId: input.organizationId,
        projectId,
        now,
        profile,
      });

  const analyticsIngested = !demo && isTinybirdConfigured();
  if (analyticsIngested) {
    yield* Effect.tryPromise({
      try: () => ingestChunks(trafficEvents, ingestGeoTrafficEvents),
      catch: (cause) =>
        new GeoTinybirdError({ label: "sample ingest failed", cause }),
    });
  }

  const response: GeoSampleDataResponse = {
    projectId,
    promptsAdded: insertedPrompts.length,
    competitorsAdded,
    sequencesAdded: insertedSequences.length,
    mentionChecks: mentionChecks.length,
    trafficEvents: trafficEvents.length,
    analyticsIngested,
  };
  return response;
});
