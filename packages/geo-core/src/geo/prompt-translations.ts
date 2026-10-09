import type { AgentTokenUsage } from "@notra/ai/types/agents";
import { describeContentBillingDenial } from "@notra/ai/utils/content-billing-messages";
import { db } from "@notra/db/drizzle";
import { geoPromptTranslations, geoSettings } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_JUDGE_MODEL,
  GEO_LANGUAGE_MAX_PROMPTS,
  GEO_SCAN_CONCURRENCY,
} from "../constants/geo";
import { GeoContentBillingService, GeoModelService } from "../deps";
import type { DbTransaction } from "../types/db";
import type {
  GeoPromptDefinition,
  GeoPromptTranslationEntry,
  GeoPromptTranslationLanguagePlan,
  GeoPromptTranslationSelectInput,
  GeoPromptTranslationsResponse,
  GeoPromptTranslationTarget,
  GeoPromptTranslationUpdateInput,
  GeoScopeInput,
  GeoSkipFields,
} from "../types/geo";
import { logGeoFailure } from "../utils/geo-log";
import { planGeoPromptTranslations } from "../utils/geo-prompt-translations";
import { addAgentTokenUsage, agentTokenUsageFrom } from "../utils/token-usage";
import { geoDb, geoSkip } from "./effect";
import {
  GeoPromptNotFoundError,
  GeoPromptTranslationError,
  GeoSettingsMissingError,
  GeoWriterCreditsExhaustedError,
} from "./errors";
import { lockGeoProject } from "./lock";
import { toGeoSettings } from "./mappers";
import { loadGeoModelCatalog } from "./model-catalog";
import { requireGeoProject } from "./projects";
import { loadGeoScanPrompts } from "./scan-prompts";

interface GeoPromptTranslationScope {
  organizationId: string;
  projectId: string;
  languages: readonly string[];
  promptLanguage: string;
  prompts: readonly GeoPromptDefinition[];
}

type Executor = typeof db | DbTransaction;

const planWith = Effect.fn("geo.promptTranslations.plan")(function* (
  executor: Executor,
  scope: GeoPromptTranslationScope
) {
  const records = yield* geoDb("prompt translations lookup failed", () =>
    executor
      .select({
        promptId: geoPromptTranslations.promptId,
        language: geoPromptTranslations.language,
        text: geoPromptTranslations.text,
        sourceText: geoPromptTranslations.sourceText,
        edited: geoPromptTranslations.edited,
      })
      .from(geoPromptTranslations)
      .where(eq(geoPromptTranslations.projectId, scope.projectId))
  );
  return planGeoPromptTranslations({
    prompts: scope.prompts,
    languages: scope.languages,
    promptLanguage: scope.promptLanguage,
    records,
  });
});

const planScope = (scope: GeoPromptTranslationScope) => planWith(db, scope);

const translationRow = (
  scope: GeoPromptTranslationScope,
  promptId: string,
  language: string
) =>
  and(
    eq(geoPromptTranslations.projectId, scope.projectId),
    eq(geoPromptTranslations.promptId, promptId),
    eq(geoPromptTranslations.language, language)
  );

/** Stores picks without a translation yet; existing rows are left alone. */
const insertPicks = (
  executor: Executor,
  scope: GeoPromptTranslationScope,
  language: string,
  promptIds: readonly string[]
) =>
  promptIds.length === 0
    ? Effect.void
    : geoDb("prompt translation pick failed", () =>
        executor
          .insert(geoPromptTranslations)
          .values(
            promptIds.map((promptId) => ({
              id: crypto.randomUUID(),
              organizationId: scope.organizationId,
              projectId: scope.projectId,
              promptId,
              language,
            }))
          )
          .onConflictDoNothing()
      ).pipe(Effect.asVoid);

/** Default picks become stored picks, so later changes only edit real rows. */
const storeDefaultPicks = (
  executor: Executor,
  scope: GeoPromptTranslationScope,
  plan: GeoPromptTranslationLanguagePlan
) =>
  plan.defaulted
    ? insertPicks(
        executor,
        scope,
        plan.language,
        plan.entries.map((entry) => entry.promptId)
      )
    : Effect.void;

/**
 * Runs a change to the picks under the project lock, re-planning inside it so
 * capacity checks and writes can't interleave with another request. A
 * rejection comes back as a value because the transaction only carries
 * database failures.
 */
const changePicks = (
  scope: GeoPromptTranslationScope,
  language: string,
  change: (
    tx: DbTransaction,
    entries: readonly GeoPromptTranslationEntry[]
  ) => Effect.Effect<GeoPromptTranslationError | null, never | Error>
) =>
  geoDb("prompt translation change failed", () =>
    db.transaction((tx) =>
      Effect.runPromise(
        Effect.gen(function* () {
          yield* lockGeoProject(tx, scope.projectId);
          const plan = (yield* planWith(tx, scope)).find(
            (item) => item.language === language
          );
          if (!plan) {
            return new GeoPromptTranslationError({ reason: "language" });
          }
          yield* storeDefaultPicks(tx, scope, plan);
          return yield* change(tx, plan.entries);
        })
      )
    )
  ).pipe(
    Effect.flatMap((rejection) =>
      rejection ? Effect.fail(rejection) : Effect.void
    )
  );

/** Saves model output only onto rows that are still picked and not hand-written. */
const saveTranslations = Effect.fn("geo.promptTranslations.save")(function* (
  scope: GeoPromptTranslationScope,
  language: string,
  translations: readonly { entry: GeoPromptTranslationEntry; text: string }[]
) {
  const saved = yield* Effect.forEach(
    translations,
    ({ entry, text }) =>
      geoDb("prompt translation save failed", () =>
        db
          .update(geoPromptTranslations)
          .set({ text, sourceText: entry.sourceText })
          .where(
            and(
              translationRow(scope, entry.promptId, language),
              eq(geoPromptTranslations.edited, false)
            )
          )
          .returning({ promptId: geoPromptTranslations.promptId })
      ),
    { concurrency: "unbounded" }
  );
  return new Set(saved.flat().map((row) => row.promptId));
});

const syncLanguage = Effect.fn("geo.promptTranslations.syncLanguage")(
  function* (
    scope: GeoPromptTranslationScope,
    plan: GeoPromptTranslationLanguagePlan,
    options: GeoPromptTranslationSyncOptions
  ) {
    const models = yield* GeoModelService;
    const entries = options.promptIds
      ? plan.entries.filter((entry) => options.promptIds?.has(entry.promptId))
      : plan.entries;
    const pending = entries.filter((entry) => entry.needsTranslation);
    const translated =
      pending.length > 0
        ? yield* models
            .translate({
              organizationId: scope.organizationId,
              language: plan.language,
              prompts: pending.map((entry) => entry.sourceText),
            })
            .pipe(
              geoSkip(`translation to ${plan.language} failed`, {
                ...options.skipFields,
                event: "geo.check.failed",
                organizationId: scope.organizationId,
                projectId: scope.projectId,
                language: plan.language,
                grounded: false,
              })
            )
        : null;
    const usage = translated ? agentTokenUsageFrom(translated.usage) : null;
    if (usage) {
      // Reported before saving: the model work happened even if a save fails.
      options.onUsage?.(usage);
    }
    const fresh = new Map<string, string>();
    if (translated && translated.translations.length === pending.length) {
      const candidates = pending.flatMap((entry, index) => {
        const text = translated.translations[index]?.trim();
        return text ? [{ entry, text }] : [];
      });
      const saved = yield* saveTranslations(scope, plan.language, candidates);
      for (const { entry, text } of candidates) {
        if (saved.has(entry.promptId)) {
          fresh.set(entry.promptId, text);
        }
      }
    }
    // A failed translation keeps an older stored text rather than dropping
    // the prompt; prompts that were never translated sit this scan out.
    const prompts: GeoPromptDefinition[] = entries.flatMap((entry) => {
      const text = fresh.get(entry.promptId) ?? entry.text;
      return text ? [{ id: entry.promptId, text }] : [];
    });
    return { language: plan.language, prompts, usage };
  }
);

interface GeoPromptTranslationSyncOptions {
  /** Only these prompts are translated and returned, e.g. for a scoped scan. */
  promptIds?: ReadonlySet<string>;
  skipFields?: GeoSkipFields;
  /** Called once per model call, as soon as its usage is known. */
  onUsage?: (usage: AgentTokenUsage) => void;
}

/**
 * Stores default picks and translates every picked prompt that has no
 * translation yet or whose prompt changed. Returns what each translated
 * language scans.
 */
export const syncGeoPromptTranslations = Effect.fn(
  "geo.promptTranslations.sync"
)(function* (
  scope: GeoPromptTranslationScope,
  options: GeoPromptTranslationSyncOptions = {}
) {
  const plans = yield* geoDb("prompt translation defaults failed", () =>
    db.transaction((tx) =>
      Effect.runPromise(
        Effect.gen(function* () {
          yield* lockGeoProject(tx, scope.projectId);
          const locked = yield* planWith(tx, scope);
          yield* Effect.forEach(locked, (plan) =>
            storeDefaultPicks(tx, scope, plan)
          );
          return locked;
        })
      )
    )
  );
  return yield* Effect.forEach(
    plans,
    (plan) => syncLanguage(scope, plan, options),
    { concurrency: GEO_SCAN_CONCURRENCY }
  );
});

const loadProjectScope = Effect.fn("geo.promptTranslations.scope")(function* (
  input: GeoScopeInput
) {
  const project = yield* requireGeoProject(input);
  const settingsRow = yield* geoDb("settings lookup failed", () =>
    db.query.geoSettings.findFirst({
      where: eq(geoSettings.projectId, project.projectId),
    })
  );
  if (!settingsRow) {
    return yield* Effect.fail(
      new GeoSettingsMissingError({ organizationId: project.organizationId })
    );
  }
  const catalog = yield* loadGeoModelCatalog(project.organizationId);
  const settings = toGeoSettings(settingsRow, catalog);
  const { prompts } = yield* loadGeoScanPrompts(settings);
  const scope: GeoPromptTranslationScope = {
    organizationId: project.organizationId,
    projectId: project.projectId,
    languages: settings.languages,
    promptLanguage: settings.promptLanguage,
    prompts,
  };
  return scope;
});

const respond = Effect.fn("geo.promptTranslations.respond")(function* (
  scope: GeoPromptTranslationScope
) {
  const response: GeoPromptTranslationsResponse = {
    promptLanguage: scope.promptLanguage,
    limit: GEO_LANGUAGE_MAX_PROMPTS,
    languages: yield* planScope(scope),
  };
  return response;
});

export const listGeoPromptTranslations = Effect.fn(
  "geo.promptTranslations.list"
)(function* (input: GeoScopeInput) {
  return yield* respond(yield* loadProjectScope(input));
});

/**
 * Translates whatever is still missing, e.g. right after a pick. Billed like
 * any other generation outside a scan: reserved first, settled on usage.
 */
export const translateGeoPromptTranslations = Effect.fn(
  "geo.promptTranslations.translate"
)(function* (input: GeoScopeInput) {
  const scope = yield* loadProjectScope(input);
  const pending = (yield* planScope(scope)).some((plan) =>
    plan.entries.some((entry) => entry.needsTranslation)
  );
  if (!pending) {
    return yield* respond(scope);
  }

  const billing = yield* GeoContentBillingService;
  const runId = `geo-prompt-translations-${crypto.randomUUID()}`;
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
        () => new GeoPromptTranslationError({ reason: "unavailable" })
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
        fallbackModelId: GEO_JUDGE_MODEL,
        properties: {
          source: "geo_prompt_translations",
          run_id: runId,
          project_id: scope.projectId,
          markup_applied: gate.useMarkup,
        },
        logPrefix: "GeoPromptTranslations",
      })
      .pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            logGeoFailure(
              "geo.prompt_translations.billing_failed",
              `Prompt translation billing ${action} failed`,
              error,
              { action, runId, projectId: scope.projectId }
            );
          })
        )
      );

  // Bill whatever the model already did, also when a later step fails.
  let spent: AgentTokenUsage | null = null;
  const settleSpent = () =>
    Effect.suspend(() =>
      spent ? settle("confirm", spent) : settle("release")
    );
  yield* syncGeoPromptTranslations(scope, {
    onUsage: (usage) => {
      spent = spent ? addAgentTokenUsage(spent, usage) : usage;
    },
  }).pipe(Effect.tapError(settleSpent));
  yield* settleSpent();
  return yield* respond(scope);
});

export const selectGeoPromptTranslation = Effect.fn(
  "geo.promptTranslations.select"
)(function* (input: GeoPromptTranslationSelectInput) {
  const scope = yield* loadProjectScope(input);
  if (!scope.prompts.some((prompt) => prompt.id === input.promptId)) {
    return yield* Effect.fail(
      new GeoPromptNotFoundError({ promptId: input.promptId })
    );
  }
  yield* changePicks(scope, input.language, (tx, entries) =>
    Effect.gen(function* () {
      const isPicked = entries.some(
        (entry) => entry.promptId === input.promptId
      );
      if (input.selected && !isPicked) {
        if (entries.length >= GEO_LANGUAGE_MAX_PROMPTS) {
          return new GeoPromptTranslationError({
            reason: "limit",
            limit: GEO_LANGUAGE_MAX_PROMPTS,
          });
        }
        yield* insertPicks(tx, scope, input.language, [input.promptId]);
      }
      if (!input.selected && isPicked) {
        if (entries.length <= 1) {
          return new GeoPromptTranslationError({ reason: "last" });
        }
        yield* geoDb("prompt translation unpick failed", () =>
          tx
            .delete(geoPromptTranslations)
            .where(translationRow(scope, input.promptId, input.language))
        );
      }
      return null;
    })
  );
  return yield* respond(scope);
});

/** Writes one picked row; a prompt not scanned in that language is refused. */
const writePickedRow = Effect.fn("geo.promptTranslations.writePicked")(
  function* (
    input: GeoPromptTranslationTarget,
    values: (entry: GeoPromptTranslationEntry) => {
      text: string | null;
      sourceText: string | null;
      edited: boolean;
    }
  ) {
    const scope = yield* loadProjectScope(input);
    yield* changePicks(scope, input.language, (tx, entries) =>
      Effect.gen(function* () {
        const entry = entries.find((item) => item.promptId === input.promptId);
        if (!entry) {
          return new GeoPromptTranslationError({ reason: "not_picked" });
        }
        yield* geoDb("prompt translation update failed", () =>
          tx
            .update(geoPromptTranslations)
            .set(values(entry))
            .where(translationRow(scope, input.promptId, input.language))
        );
        return null;
      })
    );
    return yield* respond(scope);
  }
);

/** Stores a hand-written translation; it survives later prompt edits. */
export const updateGeoPromptTranslation = (
  input: GeoPromptTranslationUpdateInput
) =>
  writePickedRow(input, (entry) => ({
    text: input.text,
    sourceText: entry.sourceText,
    edited: true,
  }));

/** Drops a translation so the next sync translates the prompt again. */
export const resetGeoPromptTranslation = (input: GeoPromptTranslationTarget) =>
  writePickedRow(input, () => ({
    text: null,
    sourceText: null,
    edited: false,
  }));

/** Drops a prompt's translations once the prompt itself is gone. */
export const deleteGeoPromptTranslations = Effect.fn(
  "geo.promptTranslations.delete"
)(function* (projectId: string, promptId: string) {
  yield* geoDb("prompt translations delete failed", () =>
    db
      .delete(geoPromptTranslations)
      .where(
        and(
          eq(geoPromptTranslations.projectId, projectId),
          eq(geoPromptTranslations.promptId, promptId)
        )
      )
  );
});

/**
 * New prompts join every translated language that still has room, so adding
 * a prompt doesn't silently leave it untracked there. Languages still on
 * their defaults pick it up through the defaults instead.
 */
export const pickNewGeoPrompts = Effect.fn("geo.promptTranslations.pickNew")(
  function* (input: GeoScopeInput, promptIds: readonly string[]) {
    if (promptIds.length === 0) {
      return;
    }
    const scope = yield* loadProjectScope(input);
    yield* geoDb("prompt translation pick failed", () =>
      db.transaction((tx) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* lockGeoProject(tx, scope.projectId);
            for (const plan of yield* planWith(tx, scope)) {
              if (plan.defaulted) {
                continue;
              }
              const room = GEO_LANGUAGE_MAX_PROMPTS - plan.entries.length;
              const picked = new Set(
                plan.entries.map((entry) => entry.promptId)
              );
              yield* insertPicks(
                tx,
                scope,
                plan.language,
                promptIds.filter((id) => !picked.has(id)).slice(0, room)
              );
            }
          })
        )
      )
    );
  }
);
