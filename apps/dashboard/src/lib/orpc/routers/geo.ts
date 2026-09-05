import {
  beginGscIntegrationDisconnect,
  claimOrConfirmGscSchedule,
  deleteGscIntegration,
  GscApiError,
  GscReauthRequiredError,
  getGscIntegration,
  getGscOAuthCredentials,
  listGscSites,
  revokeGscToken,
} from "@notra/ai/integrations/google-search-console";
import {
  createQstashRouteSchedule,
  deleteQstashSchedule,
} from "@notra/ai/qstash/triggers";
import type { GscIntegrationRow } from "@notra/ai/types/google-search-console";
import {
  GscIntegrationLockBusyError,
  GscIntegrationLockLostError,
  withGscIntegrationLock,
} from "@notra/ai/utils/gsc-integration-lock";
import { db } from "@notra/db/drizzle";
import {
  geoAgentReadinessReports,
  geoPromptSuggestions,
  geoPrompts,
  projects,
} from "@notra/db/schema";
import { GEO_SAMPLE_DATA_ENABLED } from "@notra/geo-core/constants/geo";
import {
  GSC_SCHEDULE_ID_PREFIX,
  GSC_SYNC_CRON,
  GSC_SYNC_WORKFLOW_PATH,
} from "@notra/geo-core/constants/google-search-console";
import {
  AgentReadinessApiError,
  AgentReadinessTargetMissingError,
  loadAgentReadiness,
  startAgentReadinessScan,
} from "@notra/geo-core/geo/agent-readiness";
import {
  createGeoProjectFromWebsite,
  discoverGeoWebsite,
  generateGeoFromWebsite,
} from "@notra/geo-core/geo/discover";
import type { GeoRouterError } from "@notra/geo-core/geo/errors";
import { loadGeoContentGaps } from "@notra/geo-core/geo/gaps";
import {
  issueGeoIngestSetupResponse,
  rotateGeoIngestSetupResponse,
} from "@notra/geo-core/geo/ingest";
import { lockGeoProject } from "@notra/geo-core/geo/lock";
import { toTrackedPrompt } from "@notra/geo-core/geo/mappers";
import { loadGeoModelCatalog } from "@notra/geo-core/geo/model-catalog";
import {
  saveGeoOnboardingBrand,
  searchGeoBrands,
  suggestGeoCompetitors,
} from "@notra/geo-core/geo/onboarding";
import { runGeoPersonaNow } from "@notra/geo-core/geo/persona-scan";
import {
  deleteGeoPersona,
  generateGeoPersonas,
  listGeoPersonas,
  loadGeoPersonaResults,
  updateGeoPersona,
} from "@notra/geo-core/geo/personas";
import {
  addGeoTrackedEngine,
  addGeoTrackedLanguage,
  createGeoPrompt,
  deleteGeoCompetitor,
  deleteGeoPrompt,
  importGeoCompetitors,
  importGeoPrompts,
  listGeoPrompts,
  loadAiTraffic,
  loadGeoChanges,
  loadGeoCompetitorDetail,
  loadGeoCompetitorShare,
  loadGeoCompetitors,
  loadGeoJourneyDetail,
  loadGeoLanguageShare,
  loadGeoOverview,
  loadGeoPromptHistory,
  loadGeoPromptResults,
  loadGeoSettings,
  loadGeoTimeseries,
  loadGeoTrafficJourneys,
  loadGeoTrafficLog,
  loadGeoTrafficPages,
  startGeoPromptRescan,
  startGeoScan,
  toggleGeoAutoPrompt,
  toggleGeoPrompt,
  updateGeoPrompt,
  upsertGeoCompetitor,
  upsertGeoSettings,
} from "@notra/geo-core/geo/programs";
import {
  deleteGeoProject,
  listGeoProjects,
  requireBrandIdentity,
  requireGeoProject,
} from "@notra/geo-core/geo/projects";
import { promptKey } from "@notra/geo-core/geo/prompt-key";
import {
  clearGeoSampleData,
  seedGeoSampleData,
} from "@notra/geo-core/geo/sample-data";
import { runGeoSequenceNow } from "@notra/geo-core/geo/scan";
import {
  selectGscSiteAndSyncSuggestions,
  syncGscSuggestions,
} from "@notra/geo-core/geo/search-console";
import {
  createGeoSequence,
  deleteGeoSequence,
  listGeoSequences,
  loadGeoSequenceResults,
  updateGeoSequence,
} from "@notra/geo-core/geo/sequences";
import { geoWindow } from "@notra/geo-core/geo/window";
import {
  approveAndStartGeoWriter,
  getGeoContentBrief,
  listGeoContentBriefs,
  planGeoContentBrief,
  updateGeoContentBrief,
} from "@notra/geo-core/geo/writer";
import {
  aiTrafficInputSchema,
  geoBrandSearchInputSchema,
  geoCompetitorDeleteInputSchema,
  geoCompetitorShareInputSchema,
  geoCompetitorsImportInputSchema,
  geoCompetitorDetailInputSchema,
  geoCompetitorSuggestionsInputSchema,
  geoCompetitorUpsertInputSchema,
  geoGenerateFromWebsiteInputSchema,
  geoJourneyDetailInputSchema,
  geoModelCatalogInputSchema,
  geoOnboardingBrandInputSchema,
  geoOrganizationInputSchema,
  geoProjectCreateInputSchema,
  geoProjectDeleteInputSchema,
  geoPromptCreateInputSchema,
  geoPromptHistoryInputSchema,
  geoPromptRescanInputSchema,
  geoPromptsImportInputSchema,
  geoPromptDeleteInputSchema,
  geoPromptToggleInputSchema,
  geoPromptUpdateInputSchema,
  geoAutoPromptToggleInputSchema,
  geoSequenceCreateInputSchema,
  geoSequenceDeleteInputSchema,
  geoSequenceResultsInputSchema,
  geoSequenceRunInputSchema,
  geoSequenceUpdateInputSchema,
  geoSettingsEngineAddInputSchema,
  geoSettingsLanguageAddInputSchema,
  geoSettingsUpsertInputSchema,
  geoSuggestionIdInputSchema,
  geoTimeseriesInputSchema,
  geoTrafficJourneysInputSchema,
  geoTrafficLogInputSchema,
  geoTrafficPagesInputSchema,
  geoWriterBriefIdInputSchema,
  geoWriterPlanInputSchema,
  geoWriterUpdateInputSchema,
} from "@notra/geo-core/schemas/geo";
import {
  geoPersonaDeleteInputSchema,
  geoPersonaResultsInputSchema,
  geoPersonaRunInputSchema,
  geoPersonaUpdateInputSchema,
  geoPersonasGenerateInputSchema,
} from "@notra/geo-core/schemas/geo-personas";
import { gscSelectSiteInputSchema } from "@notra/geo-core/schemas/google-search-console";
import type {
  AgentReadinessResponse,
  AgentReadinessScanResponse,
} from "@notra/geo-core/types/agent-readiness";
import type { DbTransaction } from "@notra/geo-core/types/db";
import type {
  GeoIngestSetupResponse,
  GeoTrackedPrompt,
} from "@notra/geo-core/types/geo";
import type {
  GeoSearchConsoleStatus,
  GscKeywordsResponse,
  GscSitesResponse,
  GscSyncResult,
} from "@notra/geo-core/types/google-search-console";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { QstashError } from "@upstash/qstash";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_COMPETITOR_SOURCES,
  GEO_DEFAULT_SCAN_TRIGGER,
  GEO_PROMPT_SOURCES,
  GEO_SEQUENCE_RUN_OUTCOMES,
} from "@/constants/geo-analytics";
import {
  GEO_SHELF_PREVIEW_CACHE_MS,
  GEO_SHELF_PREVIEW_OUTCOMES,
  GEO_SHELF_PREVIEW_RATE_LIMIT_MESSAGE,
  GEO_SHELF_PREVIEW_RATE_LIMIT_SCOPE,
} from "@/constants/geo-shelf";
import {
  countGeoProjects,
  loadGeoScanStartSnapshot,
  summarizeSuggestionKeywords,
  trackGeoRouterEvent,
} from "@/lib/analytics/geo-server-events";
import { identifyProjectGroup } from "@/lib/analytics/posthog-server";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import {
  assertActiveSubscription,
  assertGeoEntitlement,
} from "@/lib/billing/subscription";
import {
  collectGeoShelfMemberIds,
  findCurrentGeoShelfMemberId,
  listGeoShelfMembers,
  referencesGeoShelfMembers,
  sanitizeGeoShelfSourceMembers,
} from "@/lib/geo-shelf/members";
import { previewGeoShelfUrl } from "@/lib/geo-shelf/preview";
import {
  createGeoShelfSource,
  hasGeoShelfScanData,
  listGeoShelfSources,
  loadGeoShelfContext,
  updateGeoShelfSource,
} from "@/lib/geo-shelf/service";
import { geoCoreDashboardLayer } from "@/lib/geo/configure";
import { authorizedProcedure } from "@/lib/orpc/base";
import { runOrpcEffect } from "@/lib/orpc/effect";
import {
  badRequest,
  notFound,
  serviceUnavailable,
  tooManyRequests,
} from "@/lib/orpc/utils/errors";
import { toGeoOrpcError } from "@/lib/orpc/utils/geo-errors";
import { geoScanStartInputSchema } from "@/schemas/geo-analytics";
import {
  geoShelfCreateInputSchema,
  geoShelfListInputSchema,
  geoShelfListResponseSchema,
  geoShelfMembersResponseSchema,
  geoShelfMutationResponseSchema,
  geoShelfPreviewInputSchema,
  geoShelfPreviewResponseSchema,
  geoShelfUpdateInputSchema,
} from "@/schemas/geo-shelf";
import type { GeoHandlerTracker } from "@/types/analytics/geo-events";
import type { AuthenticatedUser } from "@/types/auth/organization";
import type {
  GeoBrandSearchHandlerInput,
  GeoCompetitorSuggestionsHandlerInput,
  GeoPromptSuggestion,
  GeoPromptSuggestionRow,
  GeoPromptSuggestionsResponse,
} from "@/types/geo";
import type { GeoDashboardRuntime } from "@/types/geo-runtime";
import type { GeoShelfMember, GeoShelfSource } from "@/types/geo-shelf";
import { ratelimit } from "@/utils/ratelimit";

interface GeoHandlerOptions<TInput> {
  context: { headers: Headers; user?: AuthenticatedUser };
  input: TInput;
}

async function assertGeoAccess(
  params: Parameters<typeof assertOrganizationAccess>[0]
): Promise<void> {
  await assertOrganizationAccess(params);
  await assertGeoEntitlement(params.organizationId);
}

function geoOpenHandler<
  TInput extends { organizationId: string },
  TOutput,
  TError extends GeoRouterError,
>(
  run: (input: TInput) => Effect.Effect<TOutput, TError, GeoDashboardRuntime>,
  track?: GeoHandlerTracker<TInput, TOutput>
) {
  return async ({
    context,
    input,
  }: GeoHandlerOptions<TInput>): Promise<TOutput> => {
    await assertOrganizationAccess({
      headers: context.headers,
      organizationId: input.organizationId,
      user: context.user,
    });

    const output = await runOrpcEffect(
      run(input).pipe(Effect.provide(geoCoreDashboardLayer)),
      toGeoOrpcError
    );
    await track?.({ context, input, output });
    return output;
  };
}

function geoHandler<
  TInput extends { organizationId: string },
  TOutput,
  TError extends GeoRouterError,
>(
  run: (input: TInput) => Effect.Effect<TOutput, TError, GeoDashboardRuntime>,
  track?: GeoHandlerTracker<TInput, TOutput>
) {
  return async ({
    context,
    input,
  }: GeoHandlerOptions<TInput>): Promise<TOutput> => {
    await assertGeoAccess({
      headers: context.headers,
      organizationId: input.organizationId,
      user: context.user,
    });

    const output = await runOrpcEffect(
      run(input).pipe(Effect.provide(geoCoreDashboardLayer)),
      toGeoOrpcError
    );
    await track?.({ context, input, output });
    return output;
  };
}

function toPromptSuggestion(row: GeoPromptSuggestionRow): GeoPromptSuggestion {
  return {
    id: row.id,
    prompt: row.prompt,
    source: row.source,
    keywords: row.sourceKeywords,
    createdAt: row.createdAt.toISOString(),
  };
}

function toGscErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof GscReauthRequiredError) {
    return "Google Search Console access expired. Please reconnect.";
  }
  // GscApiError messages are curated in the integration layer; anything else
  // (AI SDK, driver, ...) would leak internals into a user-facing toast.
  if (error instanceof GscApiError) {
    return error.message || fallback;
  }
  return fallback;
}

async function runAgentReadinessOrBadRequest<T>(
  run: () => Promise<T>
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (
      error instanceof AgentReadinessTargetMissingError ||
      error instanceof AgentReadinessApiError
    ) {
      throw badRequest(error.message);
    }
    throw error;
  }
}

async function runGscSyncOrBadRequest(
  organizationId: string
): Promise<GscSyncResult> {
  try {
    return await syncGscSuggestions(organizationId);
  } catch (error) {
    throw badRequest(
      toGscErrorMessage(error, "Failed to sync Search Console keywords")
    );
  }
}

async function withGscIntegrationLockOrServiceUnavailable<T>(
  organizationId: string,
  operation: (
    signal: AbortSignal,
    assertOwned: () => Promise<void>
  ) => Promise<T>
): Promise<T> {
  try {
    return await withGscIntegrationLock(organizationId, operation);
  } catch (error) {
    if (
      error instanceof GscIntegrationLockBusyError ||
      error instanceof GscIntegrationLockLostError
    ) {
      throw serviceUnavailable(
        "Google Search Console is temporarily busy. Please try again."
      );
    }
    throw error;
  }
}

function assertGscDisconnectNotInProgress(
  integration: GscIntegrationRow
): void {
  if (integration.disconnectingAt) {
    throw serviceUnavailable(
      "Google Search Console is being disconnected. Please try again."
    );
  }
}

function getGscScheduleId(integrationId: string): string {
  return `${GSC_SCHEDULE_ID_PREFIX}${integrationId}`;
}

async function removeStaleGscScheduleAfterLeaseLoss(
  integration: GscIntegrationRow,
  scheduleId: string
) {
  try {
    const currentIntegration = await getGscIntegration(
      integration.organizationId
    );
    if (
      currentIntegration?.id === integration.id &&
      !currentIntegration.disconnectingAt
    ) {
      return;
    }
    await removeGscSchedule(scheduleId);
  } catch (error) {
    console.error(
      "[GSC] Failed to clean up stale weekly sync schedule:",
      error
    );
  }
}

async function ensureGscSchedule(
  integration: GscIntegrationRow
): Promise<string | null> {
  return await withGscIntegrationLockOrServiceUnavailable(
    integration.organizationId,
    async (signal, assertLockOwned) => {
      const currentIntegration = await getGscIntegration(
        integration.organizationId
      );
      if (
        !currentIntegration ||
        currentIntegration.id !== integration.id ||
        currentIntegration.disconnectingAt
      ) {
        return null;
      }
      if (currentIntegration.qstashScheduleId) {
        return currentIntegration.qstashScheduleId;
      }

      const scheduleId = getGscScheduleId(currentIntegration.id);
      const legacyScheduleId = `${GSC_SCHEDULE_ID_PREFIX}${currentIntegration.organizationId}`;
      try {
        // Older releases used an organization-scoped custom ID. Remove an
        // unrecorded legacy schedule before creating this generation's ID so
        // an interrupted migration cannot leave two weekly jobs running.
        await assertLockOwned();
        await deleteGscScheduleIfPresent(legacyScheduleId);
        await assertLockOwned();
      } catch (error) {
        signal.throwIfAborted();
        console.error(
          "[GSC] Failed to reconcile legacy weekly sync schedule:",
          error
        );
        return null;
      }

      let creationError: unknown = null;
      try {
        // The QStash SDK does not accept an AbortSignal. The lock waits for
        // this request to settle and compensates below if its lease was lost.
        // Scoping the id to this integration keeps that cleanup generation-safe.
        await assertLockOwned();
        await createQstashRouteSchedule({
          path: GSC_SYNC_WORKFLOW_PATH,
          cron: GSC_SYNC_CRON,
          body: { organizationId: currentIntegration.organizationId },
          scheduleId,
        });
      } catch (error) {
        creationError = error;
      }

      try {
        await assertLockOwned();
      } catch (error) {
        await removeStaleGscScheduleAfterLeaseLoss(
          currentIntegration,
          scheduleId
        );
        throw error;
      }
      if (creationError) {
        console.error(
          "[GSC] Failed to create weekly sync schedule:",
          creationError
        );
        return null;
      }

      let claimed: GscIntegrationRow | null = null;
      try {
        claimed = await claimOrConfirmGscSchedule(
          currentIntegration,
          scheduleId,
          signal,
          assertLockOwned
        );
      } catch (error) {
        signal.throwIfAborted();
        console.error(
          "[GSC] Failed to record weekly sync schedule; retrying:",
          error
        );
        try {
          // The first write may have committed before surfacing an error. This
          // idempotent retry confirms that exact id without relying on stale fields.
          claimed = await claimOrConfirmGscSchedule(
            currentIntegration,
            scheduleId,
            signal,
            assertLockOwned
          );
        } catch (retryError) {
          signal.throwIfAborted();
          console.error(
            "[GSC] Failed to record weekly sync schedule:",
            retryError
          );
        }
      }
      signal.throwIfAborted();

      if (claimed) {
        return scheduleId;
      }

      try {
        const refreshedIntegration = await getGscIntegration(
          currentIntegration.organizationId
        );
        await assertLockOwned();
        if (refreshedIntegration?.qstashScheduleId === scheduleId) {
          return scheduleId;
        }
        // Reconnect, disconnect, and schedule creation all take the same lock,
        // so no newer integration can claim this candidate before it is removed.
        await removeGscSchedule(scheduleId);
        signal.throwIfAborted();
        return refreshedIntegration?.qstashScheduleId ?? null;
      } catch (error) {
        signal.throwIfAborted();
        // The deterministic id remains recoverable: the next ensure attempt
        // overwrites the same QStash schedule instead of creating a duplicate.
        console.error("[GSC] Failed to reconcile weekly sync schedule:", error);
        return null;
      }
    }
  );
}

async function deleteGscScheduleIfPresent(scheduleId: string) {
  try {
    await deleteQstashSchedule(scheduleId);
  } catch (error) {
    if (error instanceof QstashError && error.status === 404) {
      return;
    }
    throw error;
  }
}

async function removeGscSchedule(scheduleId: string | null) {
  if (!scheduleId) {
    return;
  }
  try {
    await deleteGscScheduleIfPresent(scheduleId);
  } catch (error) {
    console.error("[GSC] Failed to delete QStash schedule:", error);
  }
}

function getGscScheduleIdsForDisconnect(
  integration: GscIntegrationRow
): string[] {
  return [
    ...new Set(
      [
        integration.qstashScheduleId,
        getGscScheduleId(integration.id),
        `${GSC_SCHEDULE_ID_PREFIX}${integration.organizationId}`,
      ].filter((scheduleId): scheduleId is string => scheduleId !== null)
    ),
  ];
}

async function requireDefaultProjectId(
  organizationId: string
): Promise<string> {
  const row = await db.query.projects.findFirst({
    columns: { id: true },
    where: eq(projects.organizationId, organizationId),
    orderBy: [asc(projects.createdAt)],
  });
  if (!row) {
    throw badRequest("Configure your brand tracking settings first");
  }
  return row.id;
}

async function acceptSuggestionInTx(
  tx: DbTransaction,
  organizationId: string,
  projectId: string,
  suggestion: Pick<GeoPromptSuggestionRow, "id" | "prompt" | "title">
): Promise<GeoTrackedPrompt> {
  await Effect.runPromise(lockGeoProject(tx, projectId));
  // Reuse an identical tracked prompt instead of creating a duplicate.
  const existing = await tx.query.geoPrompts.findFirst({
    where: and(
      eq(geoPrompts.organizationId, organizationId),
      eq(geoPrompts.projectId, projectId),
      sql`lower(trim(${geoPrompts.prompt})) = ${promptKey(suggestion.prompt)}`
    ),
  });
  const promptRow =
    existing ??
    (
      await tx
        .insert(geoPrompts)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          projectId,
          prompt: suggestion.prompt,
          title: suggestion.title,
        })
        .returning()
    )[0];
  if (!promptRow) {
    throw badRequest("Failed to create prompt");
  }
  await tx
    .update(geoPromptSuggestions)
    .set({ status: "accepted", acceptedPromptId: promptRow.id })
    .where(eq(geoPromptSuggestions.id, suggestion.id));
  return toTrackedPrompt(promptRow);
}
async function loadGeoShelfSeed(
  context: GeoHandlerOptions<unknown>["context"],
  input: { organizationId: string; projectId?: string },
  options: { withMembers: boolean }
) {
  await assertGeoAccess({
    headers: context.headers,
    organizationId: input.organizationId,
    user: context.user,
  });
  const [shelfContext, members] = await Promise.all([
    runOrpcEffect(
      loadGeoShelfContext(input).pipe(Effect.provide(geoCoreDashboardLayer)),
      toGeoOrpcError
    ),
    options.withMembers
      ? listGeoShelfMembers(input.organizationId)
      : Promise.resolve<GeoShelfMember[]>([]),
  ]);
  return { ...shelfContext, members };
}

/** Members are only needed to strip ids of people who left the organization. */
async function resolveGeoShelfReadMembers(
  organizationId: string,
  loadedMembers: GeoShelfMember[],
  sources: GeoShelfSource[]
): Promise<GeoShelfMember[]> {
  if (loadedMembers.length > 0) {
    return loadedMembers;
  }
  if (collectGeoShelfMemberIds(sources).size === 0) {
    return [];
  }
  return await listGeoShelfMembers(organizationId);
}

export const geoRouter = {
  shelfList: authorizedProcedure
    .input(geoShelfListInputSchema)
    .handler(async ({ context, input }) => {
      const seed = await loadGeoShelfSeed(context, input, {
        withMembers: GEO_SAMPLE_DATA_ENABLED,
      });
      if (!seed.settings) {
        return geoShelfListResponseSchema.parse({
          sources: [],
          hasScanData: false,
          ownBrandName: "",
          isSampleData: false,
        });
      }
      const { sources, isSampleData } = await listGeoShelfSources({
        ...seed,
        settings: seed.settings,
      });
      const shelfMembers = await resolveGeoShelfReadMembers(
        input.organizationId,
        seed.members,
        sources
      );
      return geoShelfListResponseSchema.parse({
        sources: sanitizeGeoShelfSourceMembers(sources, shelfMembers),
        hasScanData: hasGeoShelfScanData(sources),
        ownBrandName: seed.settings.companyName,
        isSampleData,
      });
    }),
  shelfMembers: authorizedProcedure
    .input(geoShelfListInputSchema)
    .handler(async ({ context, input }) => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });
      const members = await listGeoShelfMembers(input.organizationId);
      return geoShelfMembersResponseSchema.parse({
        members,
        currentMemberId: findCurrentGeoShelfMemberId(members, context.user.id),
      });
    }),
  shelfCreate: authorizedProcedure
    .input(geoShelfCreateInputSchema)
    .handler(async ({ context, input }) => {
      const seed = await loadGeoShelfSeed(context, input, {
        withMembers:
          GEO_SAMPLE_DATA_ENABLED ||
          referencesGeoShelfMembers(input.opportunity),
      });
      if (!seed.settings) {
        throw badRequest("Configure your brand tracking settings first");
      }
      const source = await createGeoShelfSource(
        { ...seed, settings: seed.settings },
        input,
        context.user.id
      );
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_SHELF_SOURCE_CREATED,
        projectId: seed.settings.projectId,
        properties: {
          kind: source.kind,
          domain: source.domain,
          has_ticket: source.opportunity !== null,
          ticket_status: source.opportunity?.status ?? null,
          priority: source.opportunity?.priority ?? null,
          present_brand_count: source.placements.filter(
            (placement) => placement.status === "present"
          ).length,
        },
      });
      return geoShelfMutationResponseSchema.parse({ source });
    }),
  shelfUpdate: authorizedProcedure
    .input(geoShelfUpdateInputSchema)
    .handler(async ({ context, input }) => {
      const seed = await loadGeoShelfSeed(context, input, {
        withMembers:
          GEO_SAMPLE_DATA_ENABLED ||
          referencesGeoShelfMembers(input.opportunity),
      });
      if (!seed.settings) {
        throw badRequest("Configure your brand tracking settings first");
      }
      const result = await updateGeoShelfSource(
        { ...seed, settings: seed.settings },
        input,
        context.user.id
      );
      if (!result) {
        throw notFound("Shelf not found");
      }
      if (input.opportunity !== undefined) {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_SHELF_OPPORTUNITY_UPDATED,
          projectId: seed.settings.projectId,
          properties: {
            status: result.source.opportunity?.status ?? null,
            priority: result.source.opportunity?.priority ?? null,
            assignee_changed: result.assigneeChanged,
            placements_changed: result.placementsChanged,
          },
        });
      }
      return geoShelfMutationResponseSchema.parse({ source: result.source });
    }),
  shelfPreview: authorizedProcedure
    .input(geoShelfPreviewInputSchema)
    .handler(async ({ context, input }) => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });
      const rate = await ratelimit.geoShelfPreview.limit(
        `${input.organizationId}:${GEO_SHELF_PREVIEW_RATE_LIMIT_SCOPE}`
      );
      if (!rate.success) {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_SHELF_PREVIEW_REQUESTED,
          properties: { outcome: GEO_SHELF_PREVIEW_OUTCOMES.RATE_LIMITED },
        });
        throw tooManyRequests(GEO_SHELF_PREVIEW_RATE_LIMIT_MESSAGE);
      }
      const preview = await previewGeoShelfUrl(input.url);
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_SHELF_PREVIEW_REQUESTED,
        properties: {
          outcome: preview.available
            ? GEO_SHELF_PREVIEW_OUTCOMES.FETCHED
            : GEO_SHELF_PREVIEW_OUTCOMES.UNAVAILABLE,
          cache_max_age_ms: GEO_SHELF_PREVIEW_CACHE_MS,
        },
      });
      return geoShelfPreviewResponseSchema.parse(preview);
    }),
  modelCatalog: authorizedProcedure
    .input(geoModelCatalogInputSchema)
    .handler(({ input }) =>
      Effect.runPromise(
        loadGeoModelCatalog(input.organizationId).pipe(
          Effect.provide(geoCoreDashboardLayer)
        )
      )
    ),
  settings: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(geoOpenHandler((input) => loadGeoSettings(input))),
  settingsEngineAdd: authorizedProcedure
    .input(geoSettingsEngineAddInputSchema)
    .handler(geoHandler((input) => addGeoTrackedEngine(input))),
  settingsLanguageAdd: authorizedProcedure
    .input(geoSettingsLanguageAddInputSchema)
    .handler(geoHandler((input) => addGeoTrackedLanguage(input))),
  settingsUpsert: authorizedProcedure
    .input(geoSettingsUpsertInputSchema)
    .handler(
      geoHandler(
        (input) => upsertGeoSettings(input),
        ({ context, input, output }) => {
          trackGeoRouterEvent({
            context,
            input,
            event: POSTHOG_EVENTS.GEO_SETTINGS_SAVED,
            projectId: output.settings?.projectId,
            properties: {
              engine_count: input.engines.length,
              language_count: input.languages.length,
              alias_count: input.aliases.length,
              schedule_enabled: input.enabled,
              interval_hours: input.scanIntervalHours,
              enforce_zdr: output.settings?.enforceZdr ?? input.enforceZdr,
              non_zdr_approved_count: input.nonZdrApprovedEngines.length,
            },
          });
        }
      )
    ),
  languageShare: authorizedProcedure
    .input(geoTimeseriesInputSchema)
    .handler(
      geoHandler((input) => loadGeoLanguageShare(input, geoWindow(input)))
    ),
  overview: authorizedProcedure
    .input(geoTimeseriesInputSchema)
    .handler(geoHandler((input) => loadGeoOverview(input, geoWindow(input)))),
  timeseries: authorizedProcedure
    .input(geoTimeseriesInputSchema)
    .handler(geoHandler((input) => loadGeoTimeseries(input, geoWindow(input)))),
  promptResults: authorizedProcedure
    .input(geoTimeseriesInputSchema)
    .handler(
      geoHandler((input) => loadGeoPromptResults(input, geoWindow(input)))
    ),
  changes: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(geoHandler((input) => loadGeoChanges(input))),
  promptHistory: authorizedProcedure
    .input(geoPromptHistoryInputSchema)
    .handler(geoHandler((input) => loadGeoPromptHistory(input))),
  competitorShare: authorizedProcedure
    .input(geoCompetitorShareInputSchema)
    .handler(
      geoOpenHandler((input) =>
        loadGeoCompetitorShare(input, geoWindow(input), input.summaryOnly)
      )
    ),
  competitors: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(geoOpenHandler((input) => loadGeoCompetitors(input))),
  competitorUpsert: authorizedProcedure
    .input(geoCompetitorUpsertInputSchema)
    .handler(
      geoOpenHandler(
        (input) => upsertGeoCompetitor(input, input),
        ({ context, input, output }) => {
          trackGeoRouterEvent({
            context,
            input,
            event: input.previousName
              ? POSTHOG_EVENTS.GEO_COMPETITOR_UPDATED
              : POSTHOG_EVENTS.GEO_COMPETITOR_ADDED,
            properties: {
              kind: input.kind ?? null,
              source: GEO_COMPETITOR_SOURCES.MANUAL,
              has_domain: input.domain !== null,
              synonym_count: input.synonyms?.length ?? 0,
              competitor_count: output.competitors.length,
            },
          });
        }
      )
    ),
  competitorDelete: authorizedProcedure
    .input(geoCompetitorDeleteInputSchema)
    .handler(
      geoOpenHandler(
        (input) => deleteGeoCompetitor(input, input.name),
        ({ context, input, output }) => {
          trackGeoRouterEvent({
            context,
            input,
            event: POSTHOG_EVENTS.GEO_COMPETITOR_DELETED,
            properties: { competitor_count: output.competitors.length },
          });
        }
      )
    ),
  competitorsImport: authorizedProcedure
    .input(geoCompetitorsImportInputSchema)
    .handler(
      geoOpenHandler(
        (input) => importGeoCompetitors(input, input.rows),
        ({ context, input, output }) => {
          trackGeoRouterEvent({
            context,
            input,
            event: POSTHOG_EVENTS.GEO_COMPETITORS_IMPORTED,
            properties: {
              rows: input.rows.length,
              inserted: output.imported,
              updated: output.updated,
              duplicates: output.skipped,
              competitor_count: output.competitors.length,
            },
          });
        }
      )
    ),
  competitorDetail: authorizedProcedure
    .input(geoCompetitorDetailInputSchema)
    .handler(
      geoHandler((input) =>
        loadGeoCompetitorDetail(input, input.brand, geoWindow(input))
      )
    ),
  agentReadiness: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<AgentReadinessResponse> => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });
      const scope = await runOrpcEffect(
        requireGeoProject(input),
        toGeoOrpcError
      );
      return await runAgentReadinessOrBadRequest(() =>
        loadAgentReadiness(scope)
      );
    }),
  agentReadinessScan: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(
      async ({ context, input }): Promise<AgentReadinessScanResponse> => {
        await assertGeoAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });
        const scope = await runOrpcEffect(
          requireGeoProject(input),
          toGeoOrpcError
        );
        const [response, previousReport] = await Promise.all([
          runAgentReadinessOrBadRequest(() =>
            Effect.runPromise(
              startAgentReadinessScan(scope).pipe(
                Effect.provide(geoCoreDashboardLayer)
              )
            )
          ),
          db.query.geoAgentReadinessReports
            .findFirst({
              columns: { id: true },
              where: and(
                eq(geoAgentReadinessReports.projectId, scope.projectId),
                eq(geoAgentReadinessReports.status, "completed")
              ),
            })
            .catch(() => undefined),
        ]);
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.AGENT_READINESS_SCAN_STARTED,
          projectId: scope.projectId,
          properties: {
            report_id: response.reportId,
            is_rescan: previousReport !== undefined && previousReport !== null,
            already_running: response.alreadyRunning,
          },
        });
        return response;
      }
    ),
  aiTraffic: authorizedProcedure
    .input(aiTrafficInputSchema)
    .handler(geoHandler((input) => loadAiTraffic(input, geoWindow(input)))),
  trafficLog: authorizedProcedure
    .input(geoTrafficLogInputSchema)
    .handler(
      geoHandler((input) =>
        loadGeoTrafficLog(
          input,
          input.limit,
          input.visitorTypes,
          input.categories
        )
      )
    ),
  trafficJourneys: authorizedProcedure
    .input(geoTrafficJourneysInputSchema)
    .handler(
      geoHandler((input) =>
        loadGeoTrafficJourneys(input, geoWindow(input), input.limit)
      )
    ),
  journeyDetail: authorizedProcedure
    .input(geoJourneyDetailInputSchema)
    .handler(
      geoHandler((input) =>
        loadGeoJourneyDetail(input, input.journeyId, geoWindow(input))
      )
    ),
  trafficPages: authorizedProcedure
    .input(geoTrafficPagesInputSchema)
    .handler(
      geoHandler((input) =>
        loadGeoTrafficPages(
          input,
          geoWindow(input),
          input.limit,
          input.visitorType
        )
      )
    ),
  ingestSetup: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<GeoIngestSetupResponse> => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const setup = await runOrpcEffect(
        issueGeoIngestSetupResponse(input).pipe(
          Effect.provide(geoCoreDashboardLayer)
        ),
        toGeoOrpcError
      );
      if (!setup) {
        throw notFound("Organization not found");
      }
      return setup;
    }),
  ingestTokenRotate: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<GeoIngestSetupResponse> => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const setup = await runOrpcEffect(
        rotateGeoIngestSetupResponse(input).pipe(
          Effect.provide(geoCoreDashboardLayer)
        ),
        toGeoOrpcError
      );
      if (!setup) {
        throw notFound("Organization not found");
      }
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.TRAFFIC_TOKEN_ROTATED,
      });
      return setup;
    }),
  promptsList: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(geoHandler((input) => listGeoPrompts(input))),
  promptsCreate: authorizedProcedure.input(geoPromptCreateInputSchema).handler(
    geoHandler(
      (input) =>
        createGeoPrompt(input, input.prompt, input.id, input.tags ?? []),
      ({ context, input, output }) => {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_PROMPT_ADDED,
          properties: {
            source: GEO_PROMPT_SOURCES.MANUAL,
            prompt_id: output.id,
          },
        });
      }
    )
  ),
  promptsImport: authorizedProcedure.input(geoPromptsImportInputSchema).handler(
    geoHandler(
      (input) => importGeoPrompts(input, input.rows),
      ({ context, input, output }) => {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_PROMPTS_IMPORTED,
          properties: {
            rows: input.rows.length,
            inserted: output.imported,
            duplicates: output.skipped,
          },
        });
      }
    )
  ),
  promptsDelete: authorizedProcedure.input(geoPromptDeleteInputSchema).handler(
    geoHandler(
      (input) => deleteGeoPrompt(input, input.promptId),
      ({ context, input }) => {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_PROMPT_DELETED,
          properties: { count: 1, prompt_id: input.promptId },
        });
      }
    )
  ),
  promptsUpdate: authorizedProcedure.input(geoPromptUpdateInputSchema).handler(
    geoHandler((input) =>
      updateGeoPrompt(input, input.promptId, {
        enabled: input.enabled,
        tags: input.tags,
      })
    )
  ),
  promptsToggleAuto: authorizedProcedure
    .input(geoAutoPromptToggleInputSchema)
    .handler(
      geoHandler((input) =>
        toggleGeoAutoPrompt(input, input.promptId, input.enabled)
      )
    ),
  promptsToggle: authorizedProcedure.input(geoPromptToggleInputSchema).handler(
    geoHandler(
      (input) => toggleGeoPrompt(input, input.promptId, input.enabled),
      ({ context, input }) => {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_PROMPT_TOGGLED,
          properties: { enabled: input.enabled, prompt_id: input.promptId },
        });
      }
    )
  ),
  sequencesList: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(geoHandler((input) => listGeoSequences(input))),
  sequencesCreate: authorizedProcedure
    .input(geoSequenceCreateInputSchema)
    .handler(
      geoHandler(
        (input) => createGeoSequence(input, input),
        ({ context, input }) => {
          trackGeoRouterEvent({
            context,
            input,
            event: POSTHOG_EVENTS.GEO_CONVERSATION_CREATED,
            properties: { turn_count: input.steps.length },
          });
        }
      )
    ),
  sequencesUpdate: authorizedProcedure
    .input(geoSequenceUpdateInputSchema)
    .handler(
      geoHandler(
        (input) => updateGeoSequence(input, input),
        ({ context, input }) => {
          trackGeoRouterEvent({
            context,
            input,
            event: POSTHOG_EVENTS.GEO_CONVERSATION_UPDATED,
            properties: {
              sequence_id: input.sequenceId,
              turn_count: input.steps?.length ?? null,
              enabled: input.enabled ?? null,
            },
          });
        }
      )
    ),
  sequencesDelete: authorizedProcedure
    .input(geoSequenceDeleteInputSchema)
    .handler(
      geoHandler(
        (input) => deleteGeoSequence(input, input.sequenceId),
        ({ context, input }) => {
          trackGeoRouterEvent({
            context,
            input,
            event: POSTHOG_EVENTS.GEO_CONVERSATION_DELETED,
            properties: { sequence_id: input.sequenceId },
          });
        }
      )
    ),
  sequenceResults: authorizedProcedure
    .input(geoSequenceResultsInputSchema)
    .handler(
      geoHandler((input) => loadGeoSequenceResults(input, input.sequenceId))
    ),
  sequenceRun: authorizedProcedure
    .input(geoSequenceRunInputSchema)
    .handler(async ({ context, input }) => {
      const [, , rate] = await Promise.all([
        assertGeoAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        }),
        assertActiveSubscription(input.organizationId),
        ratelimit.geoSequenceRun.limit(input.organizationId),
      ]);
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_CONVERSATION_RUN_NOW,
        properties: {
          sequence_id: input.sequenceId,
          rate_limited: !rate.success,
        },
      });
      if (!rate.success) {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_SEQUENCE_RUN,
          properties: {
            sequence_id: input.sequenceId,
            outcome: GEO_SEQUENCE_RUN_OUTCOMES.RATE_LIMITED,
            rate_limited: true,
          },
        });
        throw badRequest("Too many runs. Please wait a few minutes.");
      }

      const result = await runOrpcEffect(
        runGeoSequenceNow(input, input.sequenceId).pipe(
          Effect.provide(geoCoreDashboardLayer)
        ),
        toGeoOrpcError
      );
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_SEQUENCE_RUN,
        properties: {
          sequence_id: input.sequenceId,
          outcome: GEO_SEQUENCE_RUN_OUTCOMES.COMPLETED,
          rate_limited: false,
          checks: result.checks,
          mentions: result.mentions,
          engine_count: result.engines.length,
        },
      });
      return result;
    }),
  personasList: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(geoHandler((input) => listGeoPersonas(input))),
  personasGenerate: authorizedProcedure
    .input(geoPersonasGenerateInputSchema)
    .handler(async ({ context, input }) => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });
      await assertActiveSubscription(input.organizationId);
      const rate = await ratelimit.geoPersonasGenerate.limit(
        input.organizationId
      );
      if (!rate.success) {
        throw badRequest(
          "Too many persona generations. Please wait a few minutes."
        );
      }

      const result = await runOrpcEffect(
        generateGeoPersonas(input).pipe(Effect.provide(geoCoreDashboardLayer)),
        toGeoOrpcError
      );
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_PERSONAS_GENERATED,
        properties: { persona_count: result.personas.length },
      });
      return result;
    }),
  personaUpdate: authorizedProcedure.input(geoPersonaUpdateInputSchema).handler(
    geoHandler(
      (input) => updateGeoPersona(input, input),
      ({ context, input }) => {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_PERSONA_UPDATED,
          properties: {
            persona_id: input.personaId,
            enabled: input.enabled ?? null,
          },
        });
      }
    )
  ),
  personaDelete: authorizedProcedure.input(geoPersonaDeleteInputSchema).handler(
    geoHandler(
      (input) => deleteGeoPersona(input, input.personaId),
      ({ context, input }) => {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_PERSONA_DELETED,
          properties: { persona_id: input.personaId },
        });
      }
    )
  ),
  personaResults: authorizedProcedure
    .input(geoPersonaResultsInputSchema)
    .handler(
      geoHandler((input) => loadGeoPersonaResults(input, input.personaId))
    ),
  personaRun: authorizedProcedure
    .input(geoPersonaRunInputSchema)
    .handler(async ({ context, input }) => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });
      await assertActiveSubscription(input.organizationId);
      const rate = await ratelimit.geoPersonaRun.limit(input.organizationId);
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_PERSONA_RUN_NOW,
        properties: {
          persona_id: input.personaId,
          rate_limited: !rate.success,
        },
      });
      if (!rate.success) {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_PERSONA_RUN,
          properties: {
            persona_id: input.personaId,
            outcome: GEO_SEQUENCE_RUN_OUTCOMES.RATE_LIMITED,
            rate_limited: true,
          },
        });
        throw badRequest("Too many runs. Please wait a few minutes.");
      }

      const result = await runOrpcEffect(
        runGeoPersonaNow(input, input.personaId).pipe(
          Effect.provide(geoCoreDashboardLayer)
        ),
        toGeoOrpcError
      );
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_PERSONA_RUN,
        properties: {
          persona_id: input.personaId,
          outcome: GEO_SEQUENCE_RUN_OUTCOMES.COMPLETED,
          rate_limited: false,
          checks: result.checks,
          mentions: result.mentions,
          engine_count: result.engines.length,
        },
      });
      return result;
    }),
  projectsList: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(geoOpenHandler((input) => listGeoProjects(input.organizationId))),
  projectsCreate: authorizedProcedure
    .input(geoProjectCreateInputSchema)
    .handler(
      geoHandler(
        (input) =>
          requireBrandIdentity(
            input.organizationId,
            input.brandSettingsId
          ).pipe(
            Effect.flatMap((identity) =>
              createGeoProjectFromWebsite(
                input.organizationId,
                input.name,
                input.brandSettingsId,
                identity.websiteUrl
              )
            )
          ),
        async ({ context, input, output }) => {
          const projectCount = await countGeoProjects(
            input.organizationId
          ).catch(() => null);
          identifyProjectGroup({
            projectId: output.id,
            organizationId: input.organizationId,
            userId: context.user?.id ?? null,
            properties: {
              name: output.name,
              is_sample: false,
              brand_settings_id: output.brandSettingsId,
              created_at: output.createdAt,
            },
          });
          trackGeoRouterEvent({
            context,
            input,
            event: POSTHOG_EVENTS.GEO_PROJECT_CREATED,
            projectId: output.id,
            properties: { is_sample: false, project_count: projectCount },
          });
        }
      )
    ),
  projectsDelete: authorizedProcedure
    .input(geoProjectDeleteInputSchema)
    .handler(
      geoHandler((input) =>
        deleteGeoProject(input.organizationId, input.projectId)
      )
    ),
  generateFromWebsite: authorizedProcedure
    .input(geoGenerateFromWebsiteInputSchema)
    .handler(
      geoHandler(
        (input) => generateGeoFromWebsite(input, input.url),
        ({ context, input, output }) => {
          trackGeoRouterEvent({
            context,
            input,
            event: POSTHOG_EVENTS.GEO_PROMPTS_GENERATED_FROM_WEBSITE,
            properties: {
              prompt_count: output.promptsAdded,
              competitor_count: output.competitors.length,
              alias_count: output.aliases.length,
            },
          });
        }
      )
    ),
  discoverWebsite: authorizedProcedure
    .input(geoGenerateFromWebsiteInputSchema)
    .handler(
      geoOpenHandler((input) =>
        discoverGeoWebsite(input.organizationId, input.url)
      )
    ),
  onboardingBrand: authorizedProcedure
    .input(geoOnboardingBrandInputSchema)
    .handler(geoOpenHandler((input) => saveGeoOnboardingBrand(input))),
  competitorSuggestions: authorizedProcedure
    .input(geoCompetitorSuggestionsInputSchema)
    .handler(async (options) => {
      const rate = await ratelimit.geoCompetitorSuggestions.limit(
        options.input.organizationId
      );
      if (!rate.success) {
        throw badRequest("Too many lookups. Please wait a minute.");
      }
      return geoOpenHandler((input: GeoCompetitorSuggestionsHandlerInput) =>
        suggestGeoCompetitors(input, input.domain)
      )(options);
    }),
  brandSearch: authorizedProcedure
    .input(geoBrandSearchInputSchema)
    .handler(async (options) => {
      const rate = await ratelimit.geoBrandSearch.limit(
        options.input.organizationId
      );
      if (!rate.success) {
        throw badRequest("Too many searches. Please wait a minute.");
      }
      return geoOpenHandler((input: GeoBrandSearchHandlerInput) =>
        searchGeoBrands(input, input.query)
      )(options);
    }),
  startScan: authorizedProcedure.input(geoScanStartInputSchema).handler(
    geoHandler(
      (input) => startGeoScan(input),
      async ({ context, input, output }) => {
        const snapshot = await loadGeoScanStartSnapshot(input);
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_SCAN_STARTED,
          projectId: snapshot?.projectId,
          properties: {
            trigger: input.trigger ?? GEO_DEFAULT_SCAN_TRIGGER,
            scan_id: output.scanId,
            prompt_count: snapshot?.prompt_count,
            engine_count: snapshot?.engine_count,
            language_count: snapshot?.language_count,
            is_first_scan: snapshot?.is_first_scan,
            zdr_enforced: snapshot?.zdr_enforced,
          },
        });
      }
    )
  ),
  rescanPrompt: authorizedProcedure
    .input(geoPromptRescanInputSchema)
    .handler(geoHandler((input) => startGeoPromptRescan(input))),
  writerGaps: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(geoHandler((input) => loadGeoContentGaps(input))),
  writerBriefsList: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(geoHandler((input) => listGeoContentBriefs(input))),
  writerBrief: authorizedProcedure
    .input(geoWriterBriefIdInputSchema)
    .handler(geoHandler((input) => getGeoContentBrief(input, input.briefId))),
  writerPlan: authorizedProcedure
    .input(geoWriterPlanInputSchema)
    .handler(async ({ context, input }) => {
      const [, , rate] = await Promise.all([
        assertGeoAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        }),
        assertActiveSubscription(input.organizationId),
        ratelimit.geoWriterPlan.limit(input.organizationId),
      ]);
      const briefTraits = {
        auto_approve: input.autoApprove,
        subtype: input.contentSubtype ?? null,
        source_kind: input.sourceKind ?? "manual",
        competitor_count: input.competitorIds?.length ?? 0,
        has_sitemap: Boolean(input.sitemapId),
        brand_voice_count: input.brandVoiceIds?.length ?? 0,
      };
      if (!rate.success) {
        trackGeoRouterEvent({
          context,
          input,
          event: POSTHOG_EVENTS.GEO_BRIEF_PLANNED,
          properties: { ...briefTraits, rate_limited: true },
        });
        throw badRequest("Too many briefs. Please wait a few minutes.");
      }

      const plan = await runOrpcEffect(
        planGeoContentBrief(input, context.user?.id).pipe(
          Effect.provide(geoCoreDashboardLayer)
        ),
        toGeoOrpcError
      );
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_BRIEF_PLANNED,
        properties: {
          ...briefTraits,
          rate_limited: false,
          brief_id: plan.briefId,
          brief_status: plan.status,
          has_post: plan.postId !== null,
        },
      });
      return plan;
    }),
  writerStart: authorizedProcedure
    .input(geoWriterBriefIdInputSchema)
    .handler(async ({ context, input }) => {
      await Promise.all([
        assertGeoAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        }),
        assertActiveSubscription(input.organizationId),
      ]);

      const started = await runOrpcEffect(
        approveAndStartGeoWriter(input, input.briefId).pipe(
          Effect.provide(geoCoreDashboardLayer)
        ),
        toGeoOrpcError
      );
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_WRITER_STARTED,
        properties: { brief_id: input.briefId, run_id: started.runId },
      });
      return started;
    }),
  writerUpdate: authorizedProcedure
    .input(geoWriterUpdateInputSchema)
    .handler(async ({ context, input }) => {
      await Promise.all([
        assertGeoAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        }),
        assertActiveSubscription(input.organizationId),
      ]);

      return runOrpcEffect(
        updateGeoContentBrief(input).pipe(
          Effect.provide(geoCoreDashboardLayer)
        ),
        toGeoOrpcError
      );
    }),
  sampleData: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async (options) => {
      if (!GEO_SAMPLE_DATA_ENABLED) {
        throw notFound();
      }
      return geoHandler((input) => seedGeoSampleData(input))(options);
    }),
  sampleDataClear: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async (options) => {
      if (!GEO_SAMPLE_DATA_ENABLED) {
        throw notFound();
      }
      return geoHandler((input) => clearGeoSampleData(input))(options);
    }),
  searchConsoleStatus: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<GeoSearchConsoleStatus> => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const configured = getGscOAuthCredentials() !== null;
      const integration = await getGscIntegration(input.organizationId);
      if (!integration) {
        return {
          configured,
          connected: false,
          email: null,
          siteUrl: null,
          status: null,
          lastSyncedAt: null,
          lastError: null,
          weeklySyncScheduled: false,
          sites: [],
        };
      }

      let sites: GeoSearchConsoleStatus["sites"] = [];
      let lastError = integration.lastError;
      let refreshed = integration;
      if (
        !integration.disconnectingAt &&
        !integration.siteUrl &&
        integration.status === "active"
      ) {
        try {
          sites = await listGscSites(integration);
        } catch (error) {
          console.error("[GSC] Failed to list sites:", error);
          lastError = toGscErrorMessage(
            error,
            "Failed to load Search Console properties"
          );
        }
        // Listing may have refreshed the access token or flipped the row to
        // reauth_required, so re-read only on that path.
        refreshed =
          (await getGscIntegration(input.organizationId)) ?? integration;
      }

      return {
        configured,
        connected: true,
        email: refreshed.googleAccountEmail,
        siteUrl: refreshed.siteUrl,
        status: refreshed.status,
        lastSyncedAt: refreshed.lastSyncedAt?.toISOString() ?? null,
        lastError,
        weeklySyncScheduled: refreshed.qstashScheduleId !== null,
        sites,
      };
    }),
  searchConsoleKeywords: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<GscKeywordsResponse> => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const integration = await getGscIntegration(input.organizationId);
      // A disconnect in flight may still fail its revocation; do not keep
      // highlighting keywords from an integration that is on its way out.
      return {
        keywords:
          integration && !integration.disconnectingAt
            ? integration.topQueries
            : [],
      };
    }),
  searchConsoleSites: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<GscSitesResponse> => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const integration = await getGscIntegration(input.organizationId);
      if (!integration) {
        throw notFound("Google Search Console is not connected");
      }
      assertGscDisconnectNotInProgress(integration);

      try {
        return { sites: await listGscSites(integration) };
      } catch (error) {
        console.error("[GSC] Failed to list sites:", error);
        throw badRequest(
          toGscErrorMessage(error, "Failed to load Search Console properties")
        );
      }
    }),
  searchConsoleSelectSite: authorizedProcedure
    .input(gscSelectSiteInputSchema)
    .handler(async ({ context, input }): Promise<GscSyncResult> => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const integration = await getGscIntegration(input.organizationId);
      if (!integration) {
        throw notFound("Google Search Console is not connected");
      }
      assertGscDisconnectNotInProgress(integration);

      let sites: Awaited<ReturnType<typeof listGscSites>>;
      try {
        sites = await listGscSites(integration);
      } catch (error) {
        console.error("[GSC] Failed to verify property:", error);
        throw badRequest(
          toGscErrorMessage(error, "Failed to load Search Console properties")
        );
      }
      if (!sites.some((site) => site.siteUrl === input.siteUrl)) {
        throw badRequest(
          "That property is not available on the connected Google account"
        );
      }

      let synced: GscSyncResult;
      try {
        synced = await selectGscSiteAndSyncSuggestions(
          integration,
          input.siteUrl
        );
      } catch (error) {
        console.error(
          "[GSC] Initial sync failed after selecting property:",
          error
        );
        throw badRequest(
          toGscErrorMessage(error, "Failed to sync Search Console keywords")
        );
      }
      if (synced.status !== "completed") {
        throw badRequest(
          "Search Console changed before the property could be connected"
        );
      }

      const selectedIntegration = await getGscIntegration(input.organizationId);
      let scheduleId = selectedIntegration?.qstashScheduleId ?? null;
      if (selectedIntegration?.siteUrl === input.siteUrl) {
        try {
          scheduleId = await ensureGscSchedule(selectedIntegration);
        } catch (error) {
          // The property and its first sync are already committed. Scheduling
          // remains best-effort and is backfilled by the next manual sync.
          console.error(
            "[GSC] Failed to schedule weekly sync after selecting property:",
            error
          );
        }
      }

      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GSC_SITE_SELECTED,
        properties: {
          sync_status: synced.status,
          keywords: synced.keywords ?? 0,
          suggestions_created: synced.suggestionsAdded ?? 0,
          weekly_sync_scheduled: scheduleId !== null,
        },
      });
      return synced;
    }),
  searchConsoleSync: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<GscSyncResult> => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const { success: withinLimit } = await ratelimit.gscSync.limit(
        input.organizationId
      );
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GSC_SYNC_REQUESTED,
        properties: { rate_limited: !withinLimit },
      });
      if (!withinLimit) {
        throw badRequest("Too many syncs. Please wait a few minutes.");
      }

      const integration = await getGscIntegration(input.organizationId);
      if (!integration) {
        throw notFound("Google Search Console is not connected");
      }
      assertGscDisconnectNotInProgress(integration);
      if (!integration.siteUrl) {
        throw badRequest("Select a Search Console property first");
      }

      if (!integration.qstashScheduleId) {
        // Backfill the weekly schedule if it could not be created earlier.
        await ensureGscSchedule(integration);
      }

      return await runGscSyncOrBadRequest(input.organizationId);
    }),
  searchConsoleDisconnect: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<{ disconnected: boolean }> => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const integration = await withGscIntegrationLockOrServiceUnavailable(
        input.organizationId,
        async (signal, assertLockOwned) => {
          signal.throwIfAborted();
          const disconnecting = await beginGscIntegrationDisconnect(
            input.organizationId,
            signal,
            assertLockOwned
          );
          if (!disconnecting) {
            return null;
          }

          // Keep the durable row until Google confirms the grant is revoked.
          // This request is bounded independently and must finish even if the
          // Redis lease is lost, so a retry still has the exact token to revoke.
          await assertLockOwned();
          if (!(await revokeGscToken(disconnecting))) {
            throw serviceUnavailable(
              "Google Search Console could not be disconnected. Please try again."
            );
          }
          signal.throwIfAborted();

          const scheduleIds = getGscScheduleIdsForDisconnect(disconnecting);
          try {
            await Promise.all(scheduleIds.map(deleteGscScheduleIfPresent));
          } catch (error) {
            console.error(
              "[GSC] Failed to remove schedules on disconnect:",
              error
            );
            throw serviceUnavailable(
              "Google Search Console could not be disconnected. Please try again."
            );
          }
          signal.throwIfAborted();

          const deleted = await deleteGscIntegration(
            disconnecting,
            signal,
            assertLockOwned
          );
          if (!deleted) {
            throw serviceUnavailable(
              "Google Search Console changed during disconnect. Please try again."
            );
          }

          // Catch a schedule create that settled between the first cleanup and
          // the conditional row deletion. These ids are generation-specific.
          await Promise.all(scheduleIds.map(removeGscSchedule));
          return deleted;
        }
      );
      if (!integration) {
        return { disconnected: false };
      }
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GSC_DISCONNECTED,
        properties: {
          had_site: integration.siteUrl !== null,
          had_schedule: integration.qstashScheduleId !== null,
        },
      });
      return { disconnected: true };
    }),
  suggestionsList: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(
      async ({ context, input }): Promise<GeoPromptSuggestionsResponse> => {
        await assertGeoAccess({
          headers: context.headers,
          organizationId: input.organizationId,
          user: context.user,
        });

        const rows = await db.query.geoPromptSuggestions.findMany({
          where: and(
            eq(geoPromptSuggestions.organizationId, input.organizationId),
            eq(geoPromptSuggestions.status, "pending")
          ),
          orderBy: [desc(geoPromptSuggestions.createdAt)],
        });

        return { suggestions: rows.map(toPromptSuggestion) };
      }
    ),
  suggestionAccept: authorizedProcedure
    .input(geoSuggestionIdInputSchema)
    .handler(async ({ context, input }): Promise<GeoTrackedPrompt> => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const suggestion = await db.query.geoPromptSuggestions.findFirst({
        where: and(
          eq(geoPromptSuggestions.id, input.suggestionId),
          eq(geoPromptSuggestions.organizationId, input.organizationId),
          eq(geoPromptSuggestions.status, "pending")
        ),
      });
      if (!suggestion) {
        throw notFound("Suggestion not found");
      }

      const projectId = await requireDefaultProjectId(input.organizationId);
      const accepted = await db.transaction((tx) =>
        acceptSuggestionInTx(tx, input.organizationId, projectId, suggestion)
      );
      const keywordSummary = summarizeSuggestionKeywords(
        suggestion.sourceKeywords
      );
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_SUGGESTION_ACCEPTED,
        projectId,
        properties: {
          count: 1,
          suggestion_id: suggestion.id,
          impressions: keywordSummary.impressions,
          clicks: keywordSummary.clicks,
          position: keywordSummary.position,
        },
      });
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_PROMPT_ADDED,
        projectId,
        properties: {
          source: GEO_PROMPT_SOURCES.GSC_SUGGESTION,
          prompt_id: accepted.id,
        },
      });
      return accepted;
    }),
  suggestionsAcceptAll: authorizedProcedure
    .input(geoOrganizationInputSchema)
    .handler(async ({ context, input }): Promise<{ accepted: number }> => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const rows = await db.query.geoPromptSuggestions.findMany({
        where: and(
          eq(geoPromptSuggestions.organizationId, input.organizationId),
          eq(geoPromptSuggestions.status, "pending")
        ),
        orderBy: [asc(geoPromptSuggestions.createdAt)],
      });
      if (rows.length === 0) {
        return { accepted: 0 };
      }

      const projectId = await requireDefaultProjectId(input.organizationId);
      await db.transaction(async (tx) => {
        for (const row of rows) {
          await acceptSuggestionInTx(tx, input.organizationId, projectId, row);
        }
      });
      const keywordSummary = summarizeSuggestionKeywords(
        rows.flatMap((row) => row.sourceKeywords)
      );
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_SUGGESTION_ACCEPTED_ALL,
        projectId,
        properties: {
          count: rows.length,
          impressions: keywordSummary.impressions,
          clicks: keywordSummary.clicks,
          position: keywordSummary.position,
        },
      });
      return { accepted: rows.length };
    }),
  suggestionDismiss: authorizedProcedure
    .input(geoSuggestionIdInputSchema)
    .handler(async ({ context, input }): Promise<{ dismissed: boolean }> => {
      await assertGeoAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const [row] = await db
        .update(geoPromptSuggestions)
        .set({ status: "dismissed" })
        .where(
          and(
            eq(geoPromptSuggestions.id, input.suggestionId),
            eq(geoPromptSuggestions.organizationId, input.organizationId),
            eq(geoPromptSuggestions.status, "pending")
          )
        )
        .returning({ id: geoPromptSuggestions.id });
      if (!row) {
        throw notFound("Suggestion not found");
      }
      trackGeoRouterEvent({
        context,
        input,
        event: POSTHOG_EVENTS.GEO_SUGGESTION_DISMISSED,
        properties: { count: 1, suggestion_id: row.id },
      });
      return { dismissed: true };
    }),
};
