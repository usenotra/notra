import {
  getGscIntegration,
  updateGscIntegrationIfUnchanged,
} from "@notra/ai/integrations/google-search-console";
import type {
  GscIntegrationRow,
  GscIntegrationUpdate,
} from "@notra/ai/types/google-search-console";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  geoCompetitors,
  geoPromptSuggestions,
  geoPrompts,
  geoSettings,
} from "@notra/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_GAP_TITLE_MAX_LENGTH,
  GEO_PROMPT_MAX_LENGTH,
  GEO_PROMPT_MIN_LENGTH,
} from "../constants/geo";
import { GeoModelService, GeoSearchConsoleService } from "../deps";
import {
  GeoSearchConsoleError,
  GeoSearchConsoleStampError,
} from "../schemas/search-console-errors";
import type {
  GscSuggestionSyncOutcome,
  GscSyncResult,
} from "../types/google-search-console";
import { geoDb } from "./effect";
import {
  buildBrandTerms,
  normalizeSuggestionKey,
  promptMentionsBrand,
  resolveSourceKeywords,
  selectKeywordsForModel,
} from "./suggestion-keywords";

/**
 * `lastError` is rendered in the dashboard, so only curated copy goes in —
 * raw provider/SDK messages stay in the logs.
 */
function toStoredSyncError(error: unknown): string {
  if (error instanceof GeoSearchConsoleError) {
    return error.status === 403
      ? "Google denied access to this property. Reconnect or pick another one."
      : "Search Console could not be reached. We will retry with the next sync.";
  }
  return "We could not turn your Search Console keywords into prompt suggestions.";
}

const commitGscSuggestionSync = Effect.fn("geo.searchConsole.commit")(
  function* (
    integration: GscIntegrationRow,
    outcome: GscSuggestionSyncOutcome,
    integrationUpdates: GscIntegrationUpdate
  ) {
    const lastSyncedAt = new Date(
      Math.max(Date.now(), (integration.lastSyncedAt?.getTime() ?? 0) + 1)
    );
    const suggestionsAdded = yield* geoDb(
      "commit Search Console suggestions",
      () =>
        db.transaction(async (tx) => {
          const currentIntegration = await updateGscIntegrationIfUnchanged(
            integration,
            {
              ...integrationUpdates,
              lastSyncedAt,
              lastError: null,
              topQueries: outcome.topQueries,
            },
            tx
          );
          if (!currentIntegration) {
            return null;
          }

          await tx
            .delete(geoPromptSuggestions)
            .where(
              and(
                eq(
                  geoPromptSuggestions.organizationId,
                  integration.organizationId
                ),
                eq(geoPromptSuggestions.status, "pending")
              )
            );
          if (outcome.suggestions.length === 0) {
            return 0;
          }

          const inserted = await tx
            .insert(geoPromptSuggestions)
            .values(outcome.suggestions)
            .onConflictDoNothing()
            .returning({ id: geoPromptSuggestions.id });
          return inserted.length;
        })
    );
    if (suggestionsAdded === null) {
      return {
        status: "skipped",
        reason: "integration_changed",
      } satisfies GscSyncResult;
    }
    return {
      status: "completed",
      keywords: outcome.topQueries.length,
      suggestionsAdded,
    } satisfies GscSyncResult;
  }
);

export const selectGscSiteAndSyncSuggestions = Effect.fn(
  "geo.searchConsole.selectSite"
)(function* (integration: GscIntegrationRow, siteUrl: string) {
  if (integration.disconnectingAt) {
    return {
      status: "skipped",
      reason: "integration_changed",
    } satisfies GscSyncResult;
  }
  if (integration.status === "reauth_required") {
    return {
      status: "skipped",
      reason: "reauth_required",
    } satisfies GscSyncResult;
  }

  return yield* syncIntegration(integration, siteUrl, { siteUrl });
});

export const syncGscSuggestions = Effect.fn("geo.searchConsole.sync")(
  function* (organizationId: string) {
    const integration = yield* geoDb("read Search Console integration", () =>
      getGscIntegration(organizationId)
    );
    if (!integration) {
      return {
        status: "skipped",
        reason: "not_connected",
      } satisfies GscSyncResult;
    }
    if (integration.disconnectingAt) {
      return {
        status: "skipped",
        reason: "integration_changed",
      } satisfies GscSyncResult;
    }
    if (!integration.siteUrl) {
      return {
        status: "skipped",
        reason: "no_site_selected",
      } satisfies GscSyncResult;
    }
    if (integration.status === "reauth_required") {
      return {
        status: "skipped",
        reason: "reauth_required",
      } satisfies GscSyncResult;
    }

    return yield* syncIntegration(integration, integration.siteUrl, {});
  }
);

const syncIntegration = Effect.fn("geo.searchConsole.syncIntegration")(
  function* (
    integration: GscIntegrationRow,
    siteUrl: string,
    updates: GscIntegrationUpdate
  ) {
    return yield* runSync(integration, siteUrl).pipe(
      Effect.flatMap((outcome) =>
        commitGscSuggestionSync(integration, outcome, updates)
      ),
      Effect.catch((error) =>
        Effect.gen(function* () {
          console.error("[GSC] Sync failed:", error);
          if (
            !(error instanceof GeoSearchConsoleError && error.reauthRequired)
          ) {
            yield* geoDb("stamp Search Console sync error", () =>
              updateGscIntegrationIfUnchanged(integration, {
                lastError: toStoredSyncError(error),
              })
            ).pipe(
              Effect.mapError(
                (stampCause) =>
                  new GeoSearchConsoleStampError({ cause: error, stampCause })
              )
            );
          }
          return yield* Effect.fail(error);
        })
      )
    );
  }
);

/**
 * Tracked competitors are the only third-party names the model may use in a
 * prompt. Everything else the site ranks for (e.g. "<product> changelog") is
 * navigational and not a gap the company can win.
 */
function mergeCompetitorNames(
  competitorRows: { name: string }[],
  settingsCompetitors: string[]
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const name of [
    ...competitorRows.map((row) => row.name),
    ...settingsCompetitors,
  ]) {
    const key = normalizeSuggestionKey(name);
    if (key.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    names.push(name.trim());
  }
  return names;
}

const runSync = Effect.fn("geo.searchConsole.generateSuggestions")(function* (
  integration: GscIntegrationRow,
  siteUrl: string
) {
  const organizationId = integration.organizationId;
  const google = yield* GeoSearchConsoleService;

  const [
    rows,
    settingsRow,
    brandRow,
    competitorRows,
    trackedRows,
    suggestionRows,
  ] = yield* Effect.all(
    [
      google.topQueries(integration, siteUrl),
      geoDb("read suggestion settings", () =>
        db.query.geoSettings.findFirst({
          where: eq(geoSettings.organizationId, organizationId),
          columns: { companyName: true, aliases: true, competitors: true },
        })
      ),
      geoDb("read suggestion brand", () =>
        db.query.brandSettings.findFirst({
          where: and(
            eq(brandSettings.organizationId, organizationId),
            eq(brandSettings.isDefault, true)
          ),
          columns: { companyDescription: true },
        })
      ),
      geoDb("read suggestion competitors", () =>
        db.query.geoCompetitors.findMany({
          where: eq(geoCompetitors.organizationId, organizationId),
          columns: { name: true },
        })
      ),
      geoDb("read tracked suggestions", () =>
        db.query.geoPrompts.findMany({
          where: eq(geoPrompts.organizationId, organizationId),
          columns: { prompt: true },
        })
      ),
      // Accepted/dismissed rows occupy the (organizationId, prompt) unique index
      // even after the tracked prompt is deleted. Pending rows are replaced later.
      geoDb("read prior suggestions", () =>
        db.query.geoPromptSuggestions.findMany({
          where: and(
            eq(geoPromptSuggestions.organizationId, organizationId),
            ne(geoPromptSuggestions.status, "pending")
          ),
          columns: { prompt: true },
        })
      ),
    ],
    { concurrency: "unbounded" }
  );

  const brandTerms = buildBrandTerms(settingsRow);
  const keywords = selectKeywordsForModel(rows, brandTerms);
  if (keywords.length === 0) {
    return {
      suggestions: [],
      topQueries: rows,
    };
  }

  const existingPrompts = [
    ...trackedRows.map((row) => row.prompt),
    ...suggestionRows.map((row) => row.prompt),
  ];
  const seen = new Set(existingPrompts.map(normalizeSuggestionKey));
  const keywordByQuery = new Map(
    keywords.map((row) => [normalizeSuggestionKey(row.query), row] as const)
  );

  const competitors = mergeCompetitorNames(
    competitorRows,
    settingsRow?.competitors ?? []
  );

  const models = yield* GeoModelService;
  const generated = yield* models.suggest({
    companyName: settingsRow?.companyName ?? null,
    companyDescription: brandRow?.companyDescription ?? null,
    competitors,
    siteUrl,
    keywords,
    existingPrompts,
  });

  const values: (typeof geoPromptSuggestions.$inferInsert)[] = [];
  const claimedQueries = new Set<string>();
  for (const item of generated) {
    const prompt = item.prompt.trim();
    const key = normalizeSuggestionKey(prompt);
    if (
      prompt.length < GEO_PROMPT_MIN_LENGTH ||
      prompt.length > GEO_PROMPT_MAX_LENGTH ||
      seen.has(key) ||
      promptMentionsBrand(prompt, brandTerms)
    ) {
      continue;
    }
    const sourceKeywords = resolveSourceKeywords(
      item.keywords,
      keywordByQuery,
      claimedQueries
    );
    if (sourceKeywords.length === 0) {
      continue;
    }
    const title = item.title.trim().slice(0, GEO_GAP_TITLE_MAX_LENGTH);
    seen.add(key);
    values.push({
      id: crypto.randomUUID(),
      organizationId,
      prompt,
      title: title.length > 0 ? title : null,
      source: "search_console",
      sourceKeywords,
      status: "pending",
    });
  }

  return {
    suggestions: values,
    topQueries: rows,
  } satisfies GscSuggestionSyncOutcome;
});
