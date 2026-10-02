"use client";

import { AGENT_READINESS_POLL_INTERVAL_MS } from "@notra/geo-core/constants/agent-readiness";
import {
  GEO_BRAND_SEARCH_MIN_QUERY_LENGTH,
  GEO_BRAND_SEARCH_STALE_MS,
  GEO_LIVE_FALLBACK_INTERVAL_MS,
  GEO_LIVE_SCAN_FALLBACK_INTERVAL_MS,
  GEO_MODEL_CATALOG_STALE_MS,
  GEO_SCAN_POLL_INTERVAL_MS,
  GEO_START_SCAN_MUTATION_KEY,
  GEO_TRAFFIC_LIVE_INTERVAL_MS,
} from "@notra/geo-core/constants/geo";
import type { AgentReadinessResponse } from "@notra/geo-core/types/agent-readiness";
import type {
  AiTrafficResponse,
  GeoBrandSearchResponse,
  GeoChangesResponse,
  GeoCompetitorDetailResponse,
  GeoCompetitorShareResponse,
  GeoCompetitorSuggestionsResponse,
  GeoDiscoverWebsiteResult,
  GeoJourneyDetailResponse,
  GeoLanguageShareResponse,
  GeoOnboardingBrandInput,
  GeoOnboardingBrandResult,
  GeoOverviewResponse,
  GeoIngestSetupResponse,
  GeoPromptHistoryResponse,
  GeoPromptResultSummariesResponse,
  GeoPromptRescanInput,
  GeoSequenceResultsResponse,
  GeoSettingsResponse,
  GeoSettingsUpsertInput,
  GeoTimeseriesResponse,
  GeoJourneyStatsResponse,
  GeoTrafficJourneysResponse,
  GeoTrafficLogFilters,
  GeoTrafficLogResponse,
  GeoTrafficPagesResponse,
} from "@notra/geo-core/types/geo";
import type {
  GeoCompetitorImportRow,
  GeoPromptImportRow,
} from "@notra/geo-core/types/geo-import";
import type {
  GeoSearchConsoleStatus,
  GscKeywordsResponse,
  GscSelectSiteInput,
  GscSitesResponse,
  GscSyncResult,
} from "@notra/geo-core/types/google-search-console";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import type { QueryClient } from "@tanstack/react-query";
import {
  keepPreviousData,
  skipToken,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useGeoLive } from "@/components/providers/geo-live-provider";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { geoDbOrgQueryKey, geoDbQueryKey } from "@/lib/db/geo-collections";
import type { GeoScanTrigger } from "@/types/analytics/geo-events";
import type {
  GeoGenerateFromWebsiteInput,
  GeoPromptSuggestionsResponse,
  GeoRangeQuery,
  GeoSettingsUpsertOptions,
  GeoSuggestionIdInput,
  GeoTrafficLogQueryOptions,
  GscSyncResultMessage,
} from "@/types/geo";
import { toErrorMessage } from "@/utils/error-message";
import { geoCompetitorDetailPath } from "@/utils/geo-competitors";
import { describeGeoImportResult } from "@/utils/geo-import";
import { withGeoProject } from "@/utils/geo-paths";
import {
  geoOverviewQueryInput,
  geoSettingsQueryInput,
  geoTrafficJourneysQueryInput,
  geoTrafficLogQueryInput,
  geoTrafficPagesQueryInput,
} from "@/utils/geo-query-input";
import { toGeoWindowInput } from "@/utils/geo-range";
import {
  invalidateGeoScanResultQueries,
  refreshSettingsAfterScanStart,
} from "@/utils/geo-scan-results";
import { formatGscSiteUrl } from "@/utils/gsc-site-url";

import { dashboardOrpc } from "../orpc/query";
import { useScopedPreviousData } from "./use-scoped-previous-data";

const GSC_ANALYZE_MUTATION_KEY = "gsc-analyze" as const;

function gscAnalyzeMutationKey(organizationId: string, projectId?: string) {
  return [GSC_ANALYZE_MUTATION_KEY, organizationId, projectId] as const;
}

async function invalidateCompetitorQueries(
  queryClient: QueryClient,
  organizationId: string,
  projectId: string | undefined
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.promptTranslations.queryKey({
        input: { organizationId, projectId },
      }),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.competitors.queryKey({
        input: { organizationId, projectId },
      }),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.settings.queryKey({
        input: { organizationId, projectId },
      }),
    }),
    queryClient.invalidateQueries({
      queryKey: geoDbQueryKey("competitors", { organizationId, projectId }),
    }),
  ]);
}

async function invalidatePromptQueries(
  queryClient: QueryClient,
  organizationId: string,
  projectId: string | undefined
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.promptTranslations.queryKey({
        input: { organizationId, projectId },
      }),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.promptsList.queryKey({
        input: { organizationId, projectId },
      }),
    }),
    queryClient.invalidateQueries({
      queryKey: geoDbQueryKey("prompts", { organizationId, projectId }),
    }),
  ]);
}

function geoStartScanMutationKey(
  organizationId: string,
  projectId: string | undefined
) {
  return [GEO_START_SCAN_MUTATION_KEY, organizationId, projectId] as const;
}

export function useGeoModelCatalog(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  return useQuery({
    ...dashboardOrpc.geo.modelCatalog.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId,
    staleTime: GEO_MODEL_CATALOG_STALE_MS,
    meta: { errorMessage: tToast("loadModelCatalogFailed") },
  });
}

export function useGeoSettings(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  const live = useGeoLive();
  const wasScanningRef = useRef<boolean | null>(null);
  const scanPollInterval = live
    ? GEO_LIVE_SCAN_FALLBACK_INTERVAL_MS
    : GEO_SCAN_POLL_INTERVAL_MS;

  const query = useQuery<GeoSettingsResponse>({
    ...dashboardOrpc.geo.settings.queryOptions({
      input: geoSettingsQueryInput({ organizationId, projectId }),
    }),
    enabled: !!organizationId,
    refetchInterval: (current) =>
      current.state.data?.settings?.isScanning ? scanPollInterval : false,
    refetchIntervalInBackground: false,
    meta: { errorMessage: tToast("loadAIVisibilitySettingsFailed") },
  });

  const isScanning = query.data?.settings?.isScanning ?? false;

  useEffect(() => {
    const wasScanning = wasScanningRef.current;
    wasScanningRef.current = isScanning;
    if (wasScanning === true && !isScanning) {
      invalidateGeoScanResultQueries(queryClient, {
        organizationId,
        projectId,
      }).catch(() => undefined);
    }
  }, [isScanning, organizationId, projectId, queryClient]);

  return query;
}

export function useGeoSettingsUpsert(
  organizationId: string,
  options?: GeoSettingsUpsertOptions
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GeoSettingsUpsertInput) =>
      dashboardOrpc.geo.settingsUpsert.call({
        ...input,
        organizationId,
        projectId,
      }),
    onSuccess: async () => {
      await invalidateCompetitorQueries(queryClient, organizationId, projectId);
      if (!options?.silentSuccess) {
        toast.success(tToast("aiVisibilitySettingsSaved"));
      }
    },
    onError: (error) => {
      trackEvent(POSTHOG_EVENTS.GEO_SETTINGS_SAVE_FAILED);
      toast.error(toErrorMessage(error, tToast("saveSettingsFailed")));
    },
  });
}

export function useGeoSettingsEngineAdd(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (engine: string) =>
      dashboardOrpc.geo.settingsEngineAdd.call({
        organizationId,
        projectId,
        engine,
      }),
    onSuccess: () =>
      invalidateCompetitorQueries(queryClient, organizationId, projectId),
    onError: (error) => {
      trackEvent(POSTHOG_EVENTS.GEO_SETTINGS_SAVE_FAILED);
      toast.error(toErrorMessage(error, tToast("addModelTrackingFailed")));
    },
  });
}

export function useGeoSettingsLanguageAdd(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (language: string) =>
      dashboardOrpc.geo.settingsLanguageAdd.call({
        organizationId,
        projectId,
        language,
      }),
    onSuccess: () =>
      invalidateCompetitorQueries(queryClient, organizationId, projectId),
    onError: (error) => {
      trackEvent(POSTHOG_EVENTS.GEO_SETTINGS_SAVE_FAILED);
      toast.error(toErrorMessage(error, tToast("addLanguageTrackingFailed")));
    },
  });
}

export function useGeoOverview(
  organizationId: string,
  range?: GeoRangeQuery,
  enabled = true
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoOverviewResponse>({
    ...dashboardOrpc.geo.overview.queryOptions({
      input: geoOverviewQueryInput({ organizationId, projectId }, range),
    }),
    enabled: enabled && !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: tToast("loadAIVisibilityOverviewFailed") },
  });
}

export function useGeoTimeseries(
  organizationId: string,
  range?: GeoRangeQuery,
  enabled = true
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoTimeseriesResponse>({
    ...dashboardOrpc.geo.timeseries.queryOptions({
      input: { organizationId, projectId, ...toGeoWindowInput(range) },
    }),
    enabled: enabled && !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: tToast("loadAIVisibilityTrendFailed") },
  });
}

export function useGeoPromptResults(
  organizationId: string,
  range?: GeoRangeQuery,
  enabled = true
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoPromptResultSummariesResponse>({
    ...dashboardOrpc.geo.promptResultSummaries.queryOptions({
      input: { organizationId, projectId, ...toGeoWindowInput(range) },
    }),
    enabled: enabled && !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: tToast("loadPromptResultsFailed") },
  });
}

export function useGeoPromptResultDetail(
  organizationId: string,
  checkId: string | null
) {
  const input = { organizationId, checkId: checkId ?? "" };
  return useQuery({
    ...dashboardOrpc.geo.promptResultDetail.queryOptions({
      input: organizationId && checkId ? input : skipToken,
    }),
    enabled: Boolean(organizationId && checkId),
    staleTime: Number.POSITIVE_INFINITY,
    // Keep a selected answer loading when users switch models. Consuming the
    // generated AbortSignal would otherwise surface normal switches as failed
    // requests and throw away work that is useful when they switch back.
    queryFn: () => dashboardOrpc.geo.promptResultDetail.call(input),
  });
}

export function useGeoPromptHistory(
  organizationId: string,
  promptId: string,
  options: { enabled: boolean; scanId?: string }
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoPromptHistoryResponse>({
    ...dashboardOrpc.geo.promptHistory.queryOptions({
      input: {
        organizationId,
        projectId,
        promptId,
        ...(options.scanId ? { scanId: options.scanId } : {}),
      },
    }),
    enabled: options.enabled && !!organizationId && !!promptId,
    meta: { errorMessage: tToast("loadPromptHistoryFailed") },
  });
}

export function useGeoChanges(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoChangesResponse>({
    ...dashboardOrpc.geo.changes.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    placeholderData: useScopedPreviousData<GeoChangesResponse>(projectId),
    meta: { errorMessage: tToast("loadScanChangesFailed") },
  });
}

export function useGeoCompetitorShare(
  organizationId: string,
  range?: GeoRangeQuery,
  summaryOnly = false,
  enabled = true
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoCompetitorShareResponse>({
    ...dashboardOrpc.geo.competitorShare.queryOptions({
      input: {
        organizationId,
        projectId,
        ...toGeoWindowInput(range),
        summaryOnly: summaryOnly || undefined,
      },
    }),
    enabled: enabled && !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: tToast("loadCompetitorShareFailed") },
  });
}

export function useGeoCompetitorDetail(
  organizationId: string,
  brand: string | null,
  range?: GeoRangeQuery
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoCompetitorDetailResponse>({
    ...dashboardOrpc.geo.competitorDetail.queryOptions({
      input: {
        organizationId,
        projectId,
        brand: brand ?? "",
        ...toGeoWindowInput(range),
      },
    }),
    enabled: !!organizationId && !!brand,
    staleTime: Number.POSITIVE_INFINITY,
    meta: { errorMessage: tToast("loadCompetitorDetailFailed") },
  });
}

export function useGeoCompetitorPromptSummary(
  organizationId: string,
  brand: string | null
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoCompetitorDetailResponse>({
    ...dashboardOrpc.geo.competitorDetail.queryOptions({
      input: {
        organizationId,
        projectId,
        brand: brand ?? "",
        summaryOnly: true,
      },
    }),
    enabled: !!organizationId && !!brand,
    staleTime: Number.POSITIVE_INFINITY,
    meta: { errorMessage: tToast("loadCompetitorSummaryFailed") },
  });
}

export function usePrefetchGeoCompetitorDetail(organizationId: string) {
  const queryClient = useQueryClient();
  const { projectId } = useGeoProjectScope();

  return (brand: string) => {
    if (!organizationId || brand.length === 0) {
      return;
    }
    return queryClient.prefetchQuery(
      dashboardOrpc.geo.competitorDetail.queryOptions({
        input: {
          organizationId,
          projectId,
          brand,
          ...toGeoWindowInput(undefined),
        },
      })
    );
  };
}

function geoCompetitorRowHref(
  organizationSlug: string,
  brand: string,
  projectId?: string,
  aggregate = false
): string {
  if (aggregate) {
    return withGeoProject(`/${organizationSlug}/geo/competitors`, projectId);
  }
  return withGeoProject(
    geoCompetitorDetailPath(organizationSlug, brand),
    projectId
  );
}

/**
 * Row navigation for competitor lists/charts. The aggregated "Other" slice
 * routes to the competitors index; every other brand opens its detail page
 * (and prefetches its detail query on hover).
 */
export function useGeoCompetitorRowNavigation(
  organizationSlug: string | undefined,
  organizationId: string | undefined
) {
  const router = useRouter();
  const { projectId } = useGeoProjectScope();
  const prefetchDetail = usePrefetchGeoCompetitorDetail(organizationId ?? "");

  const openRow = (brand: string, aggregate = false) => {
    if (!organizationSlug) {
      return;
    }
    router.push(
      geoCompetitorRowHref(organizationSlug, brand, projectId, aggregate)
    );
  };

  const prefetchRow = (brand: string, aggregate = false) => {
    if (!organizationSlug) {
      return;
    }
    router.prefetch(
      geoCompetitorRowHref(organizationSlug, brand, projectId, aggregate)
    );
    if (!aggregate) {
      prefetchDetail(brand);
    }
  };

  return { openRow, prefetchRow };
}

export function useGeoLanguageShare(
  organizationId: string,
  range?: GeoRangeQuery,
  enabled = true
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoLanguageShareResponse>({
    ...dashboardOrpc.geo.languageShare.queryOptions({
      input: { organizationId, projectId, ...toGeoWindowInput(range) },
    }),
    enabled: enabled && !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: tToast("loadLanguagePerformanceFailed") },
  });
}

export function useGeoGenerateFromWebsite(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GeoGenerateFromWebsiteInput) =>
      dashboardOrpc.geo.generateFromWebsite.call({
        ...input,
        organizationId,
        projectId,
      }),
    onSuccess: async () => {
      await Promise.all([
        invalidateCompetitorQueries(queryClient, organizationId, projectId),
        invalidatePromptQueries(queryClient, organizationId, projectId),
      ]);
      toast.success(tToast("geoTrackingGeneratedWebsite"));
    },
    onError: (error) => {
      toast.error(
        toErrorMessage(error, tToast("generateGEOTrackingWebsiteFailed"))
      );
    },
  });
}

export function useGeoImportPrompts(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: GeoPromptImportRow[]) =>
      dashboardOrpc.geo.promptsImport.call({ organizationId, projectId, rows }),
    onSuccess: async (result) => {
      await invalidatePromptQueries(queryClient, organizationId, projectId);
      toast.success(
        describeGeoImportResult(result)
          .map((part) =>
            tToast(`importResult.${part.key}`, {
              kind: "prompts",
              count: part.count,
            })
          )
          .join(", ")
      );
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("importPromptsFailed")));
    },
  });
}

export function useGeoImportCompetitors(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: GeoCompetitorImportRow[]) =>
      dashboardOrpc.geo.competitorsImport.call({
        organizationId,
        projectId,
        rows,
      }),
    onSuccess: async (result) => {
      await invalidateCompetitorQueries(queryClient, organizationId, projectId);
      toast.success(
        describeGeoImportResult(result)
          .map((part) =>
            tToast(`importResult.${part.key}`, {
              kind: "competitors",
              count: part.count,
            })
          )
          .join(", ")
      );
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("importCompetitorsFailed")));
    },
  });
}

export function useGeoDiscoverWebsite(
  organizationId: string,
  url: string | null,
  language?: string
) {
  return useQuery<GeoDiscoverWebsiteResult>({
    ...dashboardOrpc.geo.discoverWebsite.queryOptions({
      input: { organizationId, url: url ?? "", language },
    }),
    enabled: !!organizationId && url !== null,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

export function useGeoOnboardingBrand(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useMutation({
    mutationFn: (
      input: Omit<GeoOnboardingBrandInput, "organizationId" | "projectId">
    ): Promise<GeoOnboardingBrandResult> =>
      dashboardOrpc.geo.onboardingBrand.call({
        ...input,
        organizationId,
        projectId,
      }),
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("saveBrandFailed")));
    },
  });
}

export function useGeoCompetitorSuggestions(
  organizationId: string,
  domain: string | null
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoCompetitorSuggestionsResponse>({
    ...dashboardOrpc.geo.competitorSuggestions.queryOptions({
      input: { organizationId, projectId, domain: domain ?? "" },
    }),
    enabled: !!organizationId && domain !== null,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

export function useGeoBrandSearch(organizationId: string, query: string) {
  const { projectId } = useGeoProjectScope();
  const trimmed = query.trim();
  return useQuery<GeoBrandSearchResponse>({
    ...dashboardOrpc.geo.brandSearch.queryOptions({
      input: { organizationId, projectId, query: trimmed },
    }),
    enabled:
      !!organizationId && trimmed.length >= GEO_BRAND_SEARCH_MIN_QUERY_LENGTH,
    staleTime: GEO_BRAND_SEARCH_STALE_MS,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useGeoStartScan(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: geoStartScanMutationKey(organizationId, projectId),
    mutationFn: (
      input?: GeoScanTrigger | { trigger?: GeoScanTrigger; engines?: string[] }
    ) => {
      const payload =
        typeof input === "string" ? { trigger: input } : (input ?? {});
      return dashboardOrpc.geo.startScan.call({
        organizationId,
        projectId,
        trigger: payload.trigger,
        engines: payload.engines,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.scanRun.key({
          input: { organizationId, projectId },
        }),
      });
      await refreshSettingsAfterScanStart(
        queryClient,
        organizationId,
        projectId
      );
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("startScanFailed")));
    },
  });
}

export function useGeoRescanPrompt(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: geoStartScanMutationKey(organizationId, projectId),
    mutationFn: (
      input: string | Pick<GeoPromptRescanInput, "promptId" | "engines">
    ) => {
      const payload = typeof input === "string" ? { promptId: input } : input;
      return dashboardOrpc.geo.rescanPrompt.call({
        organizationId,
        projectId,
        promptId: payload.promptId,
        engines: payload.engines ? [...payload.engines] : undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.scanRun.key({
          input: { organizationId, projectId },
        }),
      });
      await refreshSettingsAfterScanStart(
        queryClient,
        organizationId,
        projectId
      );
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("startRescanFailed")));
    },
  });
}

export function useIsGeoScanning(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const { data } = useGeoSettings(organizationId);
  const pendingCount = useIsMutating({
    mutationKey: geoStartScanMutationKey(organizationId, projectId),
  });
  return pendingCount > 0 || Boolean(data?.settings?.isScanning);
}

export function useAgentReadiness(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<AgentReadinessResponse>({
    ...dashboardOrpc.geo.agentReadiness.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    refetchInterval: (query) =>
      query.state.data?.scan?.status === "running"
        ? AGENT_READINESS_POLL_INTERVAL_MS
        : false,
    refetchIntervalInBackground: false,
    meta: { errorMessage: tToast("loadAgentReadinessFailed") },
  });
}

export function useAgentReadinessScan(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      dashboardOrpc.geo.agentReadinessScan.call({ organizationId, projectId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.agentReadiness.queryKey({
          input: { organizationId, projectId },
        }),
      });
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("startScanFailed")));
    },
  });
}

function useGeoTrafficPollInterval(): number {
  return useGeoLive()
    ? GEO_LIVE_FALLBACK_INTERVAL_MS
    : GEO_TRAFFIC_LIVE_INTERVAL_MS;
}

export function useAiTraffic(organizationId: string, range?: GeoRangeQuery) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const trafficPollInterval = useGeoTrafficPollInterval();
  return useQuery<AiTrafficResponse>({
    ...dashboardOrpc.geo.aiTraffic.queryOptions({
      input: geoOverviewQueryInput({ organizationId, projectId }, range),
    }),
    enabled: !!organizationId,
    placeholderData: useScopedPreviousData<AiTrafficResponse>(projectId),
    refetchInterval: trafficPollInterval,
    refetchIntervalInBackground: false,
    meta: { errorMessage: tToast("loadAITrafficFailed") },
  });
}

export function useGeoTrafficLog(
  organizationId: string,
  filters: GeoTrafficLogFilters,
  options?: GeoTrafficLogQueryOptions
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const trafficPollInterval = useGeoTrafficPollInterval();
  return useQuery<GeoTrafficLogResponse>({
    ...dashboardOrpc.geo.trafficLog.queryOptions({
      input: geoTrafficLogQueryInput(
        { organizationId, projectId },
        filters,
        options?.host
      ),
    }),
    enabled: !!organizationId,
    placeholderData: useScopedPreviousData<GeoTrafficLogResponse>(projectId),
    refetchInterval: trafficPollInterval,
    refetchIntervalInBackground: false,
    meta: { errorMessage: tToast("loadAITrackingLogFailed") },
  });
}

export function useGeoTrafficPages(
  organizationId: string,
  range?: GeoRangeQuery,
  host?: string
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const trafficPollInterval = useGeoTrafficPollInterval();
  return useQuery<GeoTrafficPagesResponse>({
    ...dashboardOrpc.geo.trafficPages.queryOptions({
      input: geoTrafficPagesQueryInput(
        { organizationId, projectId },
        range,
        host
      ),
    }),
    enabled: !!organizationId,
    placeholderData: useScopedPreviousData<GeoTrafficPagesResponse>(projectId),
    refetchInterval: trafficPollInterval,
    refetchIntervalInBackground: false,
    meta: { errorMessage: tToast("loadTopAIPagesFailed") },
  });
}

export function useGeoTrafficJourneys(
  organizationId: string,
  range?: GeoRangeQuery,
  enabled = true
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoTrafficJourneysResponse>({
    ...dashboardOrpc.geo.trafficJourneys.queryOptions({
      input: geoTrafficJourneysQueryInput({ organizationId, projectId }, range),
    }),
    enabled: enabled && !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: tToast("loadAIJourneysFailed") },
  });
}

export function useGeoJourneyStats(
  organizationId: string,
  range?: GeoRangeQuery,
  enabled = true
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoJourneyStatsResponse>({
    ...dashboardOrpc.geo.journeyStats.queryOptions({
      input: geoOverviewQueryInput({ organizationId, projectId }, range),
    }),
    enabled: enabled && !!organizationId,
    placeholderData: keepPreviousData,
    meta: {
      errorMessage: tToast("loadJourneyTrendsFailed"),
      showRetryAction: true,
    },
  });
}

export function useGeoJourneyDetail(
  organizationId: string,
  journeyId: string | null,
  range?: GeoRangeQuery
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoJourneyDetailResponse>({
    ...dashboardOrpc.geo.journeyDetail.queryOptions({
      input: {
        organizationId,
        projectId,
        journeyId: journeyId ?? "",
        ...toGeoWindowInput(range),
      },
    }),
    enabled: !!organizationId && !!journeyId,
    meta: { errorMessage: tToast("loadJourneyDetailFailed") },
  });
}

export function usePrefetchGeoJourneyDetail(organizationId: string) {
  const queryClient = useQueryClient();
  const { projectId } = useGeoProjectScope();

  return (journeyId: string) => {
    if (!organizationId || journeyId.length === 0) {
      return;
    }
    return queryClient.prefetchQuery(
      dashboardOrpc.geo.journeyDetail.queryOptions({
        input: {
          organizationId,
          projectId,
          journeyId,
          ...toGeoWindowInput(undefined),
        },
      })
    );
  };
}

export function useGeoIngestSetup(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoIngestSetupResponse>({
    ...dashboardOrpc.geo.ingestSetup.queryOptions({
      input: geoSettingsQueryInput({ organizationId, projectId }),
    }),
    enabled: !!organizationId,
    meta: { errorMessage: tToast("loadTrackingSetupFailed") },
  });
}

export function useGeoIngestTokenRotate(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<GeoIngestSetupResponse> =>
      dashboardOrpc.geo.ingestTokenRotate.call({ organizationId, projectId }),
    onSuccess: async (setup) => {
      queryClient.setQueryData(
        dashboardOrpc.geo.ingestSetup.queryKey({
          input: { organizationId, projectId },
        }),
        setup
      );
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.ingestSetup.queryKey({
          input: { organizationId, projectId },
        }),
      });
      toast.success(tToast("trackingTokenRotated"));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("rotateTokenFailed")));
    },
  });
}

export function useGeoRunSequence(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sequenceId: string) =>
      dashboardOrpc.geo.sequenceRun.call({
        organizationId,
        projectId,
        sequenceId,
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.sequenceResults.key(),
      });
      const engineCount = result.engines.length;
      toast.success(tToast("conversationPlayed", { count: engineCount }));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("runConversationFailed")));
    },
  });
}

export function useGeoSequenceResults(
  organizationId: string,
  sequenceId?: string
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoSequenceResultsResponse>({
    ...dashboardOrpc.geo.sequenceResults.queryOptions({
      input: { organizationId, projectId, sequenceId },
    }),
    enabled: Boolean(organizationId && sequenceId),
    meta: { errorMessage: tToast("loadConversationResultsFailed") },
  });
}

function describeSyncResult(result: GscSyncResult): GscSyncResultMessage {
  if (result.status === "failed") {
    return { key: "failed", count: 0 };
  }
  if (result.status !== "completed") {
    return { key: "skipped", count: 0 };
  }
  const added = result.suggestionsAdded ?? 0;
  if (added === 0) {
    return (result.keywords ?? 0) === 0
      ? { key: "noData", count: 0 }
      : { key: "noNewSuggestions", count: 0 };
  }
  return { key: "suggestionsAdded", count: added };
}

export function useGscStatus(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoSearchConsoleStatus>({
    ...dashboardOrpc.geo.searchConsoleStatus.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: tToast("loadSearchConsoleStatusFailed") },
  });
}

export function useGscKeywords(organizationId: string, enabled = true) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GscKeywordsResponse>({
    ...dashboardOrpc.geo.searchConsoleKeywords.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId && enabled,
    meta: { errorMessage: tToast("loadSearchConsoleKeywordsFailed") },
  });
}

export function useGscSites(organizationId: string, enabled: boolean) {
  const tToast = useTranslations("geo.toasts");
  return useQuery<GscSitesResponse>({
    ...dashboardOrpc.geo.searchConsoleSites.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId && enabled,
    meta: { errorMessage: tToast("loadSearchConsolePropertiesFailed") },
  });
}

function useInvalidateGscQueries(organizationId: string, projectId?: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.searchConsoleStatus.queryKey({
          input: projectId ? { organizationId, projectId } : { organizationId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.suggestionsList.queryKey({
          input: projectId ? { organizationId, projectId } : { organizationId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.searchConsoleKeywords.queryKey({
          input: projectId ? { organizationId, projectId } : { organizationId },
        }),
      }),
    ]);
  };
}

export function useGscAnalyzing(organizationId: string): boolean {
  const { projectId } = useGeoProjectScope();
  return (
    useIsMutating({
      mutationKey: gscAnalyzeMutationKey(organizationId, projectId),
      exact: true,
    }) > 0
  );
}

export function useGscSelectSite(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const invalidate = useInvalidateGscQueries(organizationId, projectId);
  // Scoped so a slow sync in one project isn't overwritten by another.
  const toastId = `gsc-select-site:${organizationId}:${projectId ?? "default"}`;
  return useMutation({
    mutationKey: gscAnalyzeMutationKey(organizationId, projectId),
    mutationFn: (input: GscSelectSiteInput) =>
      dashboardOrpc.geo.searchConsoleSelectSite.call({
        ...input,
        organizationId,
        projectId,
      }),
    // The first sync can take a while, so progress lives in a toast and the
    // caller can close its dialog right away.
    onMutate: (input) => {
      toast.loading(
        tToast("connectingProperty", {
          property: formatGscSiteUrl(input.siteUrl),
        }),
        {
          description: tToast("connectingPropertyDescription"),
          id: toastId,
        }
      );
    },
    onSuccess: async (result) => {
      await invalidate();
      const message = describeSyncResult(result);
      const notify = result.status === "failed" ? toast.error : toast.success;
      notify(
        tToast(`searchConsoleSync.${message.key}`, { count: message.count }),
        { description: null, id: toastId }
      );
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("selectPropertyFailed")), {
        description: null,
        id: toastId,
      });
    },
  });
}

export function useGscSync(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const invalidate = useInvalidateGscQueries(organizationId, projectId);
  return useMutation({
    mutationKey: gscAnalyzeMutationKey(organizationId, projectId),
    mutationFn: () =>
      dashboardOrpc.geo.searchConsoleSync.call({ organizationId, projectId }),
    onSuccess: async (result) => {
      await invalidate();
      if (result.status === "failed") {
        const message = describeSyncResult(result);
        toast.error(
          tToast(`searchConsoleSync.${message.key}`, { count: message.count })
        );
      } else {
        const message = describeSyncResult(result);
        toast.success(
          tToast(`searchConsoleSync.${message.key}`, { count: message.count })
        );
      }
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("syncSearchConsoleFailed")));
    },
  });
}

export function useGscDisconnect(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const invalidate = useInvalidateGscQueries(organizationId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      dashboardOrpc.geo.searchConsoleDisconnect.call({ organizationId }),
    onSuccess: async () => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.geo.searchConsoleSites.queryKey({
            input: { organizationId },
          }),
        }),
      ]);
      toast.success(tToast("googleSearchConsoleDisconnected"));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("disconnectFailed")));
    },
  });
}

export function useGeoSuggestions(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoPromptSuggestionsResponse>({
    ...dashboardOrpc.geo.suggestionsList.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: tToast("loadPromptSuggestionsFailed") },
  });
}

function useInvalidateSuggestionQueries(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.suggestionsList.queryKey({
          input: { organizationId, projectId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.promptsList.queryKey({
          input: { organizationId, projectId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.writerGaps.queryKey({
          input: { organizationId, projectId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: geoDbOrgQueryKey("prompts", organizationId),
      }),
    ]);
  };
}

export function useGeoSequencesGenerate(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      dashboardOrpc.geo.sequencesGenerate.call({ organizationId, projectId }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: geoDbOrgQueryKey("sequences", organizationId),
      });
      const count = response.sequences.length;
      toast.success(tToast("conversationsAdded", { count }));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("generateConversationsFailed")));
    },
  });
}

export function useGeoSuggestionAccept(
  organizationId: string,
  onViewPrompt: (promptId: string) => void
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const invalidate = useInvalidateSuggestionQueries(organizationId);
  return useMutation({
    mutationFn: (input: GeoSuggestionIdInput) =>
      dashboardOrpc.geo.suggestionAccept.call({
        ...input,
        organizationId,
        projectId,
      }),
    onSuccess: async (prompt) => {
      await invalidate();
      toast.success(tToast("promptAddedTracking"), {
        description: tToast("trackedPromptNextScan"),
        action: {
          label: tToast("viewTrackedPrompt"),
          onClick: () => onViewPrompt(prompt.id),
        },
      });
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("addPromptFailed")));
    },
  });
}

export function useGeoSuggestionsAcceptAll(
  organizationId: string,
  onViewPrompts: () => void
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const invalidate = useInvalidateSuggestionQueries(organizationId);
  return useMutation({
    mutationFn: () =>
      dashboardOrpc.geo.suggestionsAcceptAll.call({
        organizationId,
        projectId,
      }),
    onSuccess: async (result) => {
      await invalidate();
      toast.success(
        tToast("promptsAddedTracking", { count: result.accepted }),
        {
          description: tToast("trackedPromptNextScan"),
          action: {
            label: tToast("viewTrackedPrompt"),
            onClick: onViewPrompts,
          },
        }
      );
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("addPromptsFailed")));
    },
  });
}

export function useGeoSuggestionDismiss(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  const invalidate = useInvalidateSuggestionQueries(organizationId);
  return useMutation({
    mutationFn: (input: GeoSuggestionIdInput) =>
      dashboardOrpc.geo.suggestionDismiss.call({
        ...input,
        organizationId,
        projectId,
      }),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, tToast("dismissSuggestionFailed")));
    },
  });
}
