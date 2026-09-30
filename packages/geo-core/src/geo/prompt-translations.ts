import { db } from "@notra/db/drizzle";
import { geoPromptTranslations, geoSettings } from "@notra/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_LANGUAGE_MAX_PROMPTS,
  GEO_SCAN_CONCURRENCY,
} from "../constants/geo";
import { GeoModelService } from "../deps";
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
import { planGeoPromptTranslations } from "../utils/geo-prompt-translations";
import { agentTokenUsageFrom } from "../utils/token-usage";
import { geoDb, geoSkip } from "./effect";
import {
  GeoPromptNotFoundError,
  GeoPromptTranslationError,
  GeoSettingsMissingError,
} from "./errors";
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

const loadRecords = (projectId: string) =>
  geoDb("prompt translations lookup failed", () =>
    db
      .select({
        promptId: geoPromptTranslations.promptId,
        language: geoPromptTranslations.language,
        text: geoPromptTranslations.text,
        sourceText: geoPromptTranslations.sourceText,
        edited: geoPromptTranslations.edited,
      })
      .from(geoPromptTranslations)
      .where(eq(geoPromptTranslations.projectId, projectId))
  );

const planScope = Effect.fn("geo.promptTranslations.plan")(function* (
  scope: GeoPromptTranslationScope
) {
  const records = yield* loadRecords(scope.projectId);
  return planGeoPromptTranslations({
    prompts: scope.prompts,
    languages: scope.languages,
    promptLanguage: scope.promptLanguage,
    records,
  });
});

/** Stores picks without a translation yet; existing rows are left alone. */
const insertPicks = Effect.fn("geo.promptTranslations.insertPicks")(function* (
  scope: GeoPromptTranslationScope,
  language: string,
  promptIds: readonly string[]
) {
  if (promptIds.length === 0) {
    return;
  }
  yield* geoDb("prompt translation pick failed", () =>
    db
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
  );
});

const saveTranslations = Effect.fn("geo.promptTranslations.save")(function* (
  scope: GeoPromptTranslationScope,
  language: string,
  translations: readonly { entry: GeoPromptTranslationEntry; text: string }[]
) {
  if (translations.length === 0) {
    return;
  }
  yield* geoDb("prompt translation save failed", () =>
    db
      .insert(geoPromptTranslations)
      .values(
        translations.map(({ entry, text }) => ({
          id: crypto.randomUUID(),
          organizationId: scope.organizationId,
          projectId: scope.projectId,
          promptId: entry.promptId,
          language,
          text,
          sourceText: entry.sourceText,
        }))
      )
      .onConflictDoUpdate({
        target: [
          geoPromptTranslations.projectId,
          geoPromptTranslations.promptId,
          geoPromptTranslations.language,
        ],
        set: {
          text: sql`excluded.text`,
          sourceText: sql`excluded.source_text`,
          edited: false,
          updatedAt: new Date(),
        },
      })
  );
});

const syncLanguage = Effect.fn("geo.promptTranslations.syncLanguage")(
  function* (
    scope: GeoPromptTranslationScope,
    plan: GeoPromptTranslationLanguagePlan,
    skipFields?: GeoSkipFields
  ) {
    const models = yield* GeoModelService;
    if (plan.defaulted) {
      yield* insertPicks(
        scope,
        plan.language,
        plan.entries.map((entry) => entry.promptId)
      );
    }
    const pending = plan.entries.filter((entry) => entry.needsTranslation);
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
                ...skipFields,
                event: "geo.check.failed",
                organizationId: scope.organizationId,
                projectId: scope.projectId,
                language: plan.language,
                grounded: false,
              })
            )
        : null;
    const fresh = new Map<string, string>();
    if (translated && translated.translations.length === pending.length) {
      const saved = pending.flatMap((entry, index) => {
        const text = translated.translations[index]?.trim();
        return text ? [{ entry, text }] : [];
      });
      yield* saveTranslations(scope, plan.language, saved);
      for (const { entry, text } of saved) {
        fresh.set(entry.promptId, text);
      }
    }
    // A failed translation keeps an older stored text rather than dropping
    // the prompt; prompts that were never translated sit this scan out.
    const prompts: GeoPromptDefinition[] = plan.entries.flatMap((entry) => {
      const text = fresh.get(entry.promptId) ?? entry.text;
      return text ? [{ id: entry.promptId, text }] : [];
    });
    return {
      language: plan.language,
      prompts,
      usage: translated ? agentTokenUsageFrom(translated.usage) : null,
    };
  }
);

/**
 * Stores default picks and translates every picked prompt that has no
 * translation yet or whose prompt changed. Returns what each translated
 * language scans.
 */
export const syncGeoPromptTranslations = Effect.fn(
  "geo.promptTranslations.sync"
)(function* (scope: GeoPromptTranslationScope, skipFields?: GeoSkipFields) {
  const plans = yield* planScope(scope);
  return yield* Effect.forEach(
    plans,
    (plan) => syncLanguage(scope, plan, skipFields),
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

function toResponse(
  scope: GeoPromptTranslationScope,
  languages: GeoPromptTranslationLanguagePlan[]
): GeoPromptTranslationsResponse {
  return {
    promptLanguage: scope.promptLanguage,
    limit: GEO_LANGUAGE_MAX_PROMPTS,
    languages,
  };
}

export const listGeoPromptTranslations = Effect.fn(
  "geo.promptTranslations.list"
)(function* (input: GeoScopeInput) {
  const scope = yield* loadProjectScope(input);
  return toResponse(scope, yield* planScope(scope));
});

/** Translates whatever is still missing, e.g. right after a pick. */
export const translateGeoPromptTranslations = Effect.fn(
  "geo.promptTranslations.translate"
)(function* (input: GeoScopeInput) {
  const scope = yield* loadProjectScope(input);
  yield* syncGeoPromptTranslations(scope);
  return toResponse(scope, yield* planScope(scope));
});

/**
 * Loads the language a change targets. A language still on its default picks
 * gets them stored first, so every change after this edits real rows only.
 */
const loadPicksForChange = Effect.fn("geo.promptTranslations.picksForChange")(
  function* (input: GeoScopeInput & { language: string }) {
    const scope = yield* loadProjectScope(input);
    const plan = (yield* planScope(scope)).find(
      (item) => item.language === input.language
    );
    if (!plan) {
      return yield* Effect.fail(
        new GeoPromptTranslationError({ reason: "language" })
      );
    }
    if (plan.defaulted) {
      yield* insertPicks(
        scope,
        plan.language,
        plan.entries.map((entry) => entry.promptId)
      );
    }
    return { scope, entries: plan.entries };
  }
);

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

export const selectGeoPromptTranslation = Effect.fn(
  "geo.promptTranslations.select"
)(function* (input: GeoPromptTranslationSelectInput) {
  const { scope, entries } = yield* loadPicksForChange(input);
  if (!scope.prompts.some((prompt) => prompt.id === input.promptId)) {
    return yield* Effect.fail(
      new GeoPromptNotFoundError({ promptId: input.promptId })
    );
  }
  const isPicked = entries.some((entry) => entry.promptId === input.promptId);

  if (input.selected && !isPicked) {
    if (entries.length >= GEO_LANGUAGE_MAX_PROMPTS) {
      return yield* Effect.fail(
        new GeoPromptTranslationError({
          reason: "limit",
          limit: GEO_LANGUAGE_MAX_PROMPTS,
        })
      );
    }
    yield* insertPicks(scope, input.language, [input.promptId]);
  }

  if (!input.selected && isPicked) {
    if (entries.length <= 1) {
      return yield* Effect.fail(
        new GeoPromptTranslationError({ reason: "last" })
      );
    }
    yield* geoDb("prompt translation unpick failed", () =>
      db
        .delete(geoPromptTranslations)
        .where(translationRow(scope, input.promptId, input.language))
    );
  }

  return toResponse(scope, yield* planScope(scope));
});

const findPickedEntry = Effect.fn("geo.promptTranslations.findPicked")(
  function* (input: GeoPromptTranslationTarget) {
    const { scope, entries } = yield* loadPicksForChange(input);
    const entry = entries.find((item) => item.promptId === input.promptId);
    if (!entry) {
      return yield* Effect.fail(
        new GeoPromptTranslationError({ reason: "not_picked" })
      );
    }
    return { scope, entry };
  }
);

/** Stores a hand-written translation; it survives later prompt edits. */
export const updateGeoPromptTranslation = Effect.fn(
  "geo.promptTranslations.update"
)(function* (input: GeoPromptTranslationUpdateInput) {
  const { scope, entry } = yield* findPickedEntry(input);
  yield* geoDb("prompt translation update failed", () =>
    db
      .update(geoPromptTranslations)
      .set({ text: input.text, sourceText: entry.sourceText, edited: true })
      .where(translationRow(scope, input.promptId, input.language))
  );
  return toResponse(scope, yield* planScope(scope));
});

/** Drops a translation so the next sync translates the prompt again. */
export const resetGeoPromptTranslation = Effect.fn(
  "geo.promptTranslations.reset"
)(function* (input: GeoPromptTranslationTarget) {
  const { scope } = yield* findPickedEntry(input);
  yield* geoDb("prompt translation reset failed", () =>
    db
      .update(geoPromptTranslations)
      .set({ text: null, sourceText: null, edited: false })
      .where(translationRow(scope, input.promptId, input.language))
  );
  return toResponse(scope, yield* planScope(scope));
});

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
    const plans = yield* planScope(scope);
    for (const plan of plans) {
      if (plan.defaulted) {
        continue;
      }
      const room = GEO_LANGUAGE_MAX_PROMPTS - plan.entries.length;
      const picked = new Set(plan.entries.map((entry) => entry.promptId));
      yield* insertPicks(
        scope,
        plan.language,
        promptIds.filter((promptId) => !picked.has(promptId)).slice(0, room)
      );
    }
  }
);
