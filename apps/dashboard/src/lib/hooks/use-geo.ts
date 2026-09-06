"use client";

import { AGENT_READINESS_POLL_INTERVAL_MS } from "@notra/geo-core/constants/agent-readiness";
import {
  AI_TRAFFIC_LOG_FETCH_LIMIT,
  AI_TRAFFIC_PAGES_FETCH_LIMIT,
  GEO_BRAND_SEARCH_MIN_QUERY_LENGTH,
  GEO_BRAND_SEARCH_STALE_MS,
  GEO_MODEL_CATALOG_STALE_MS,
  GEO_SCAN_POLL_INTERVAL_MS,
  GEO_START_SCAN_MUTATION_KEY,
} from "@notra/geo-core/constants/geo";
import type { AgentReadinessResponse } from "@notra/geo-core/types/agent-readiness";
import type {
  AiTrafficResponse,
  GeoBrandSearchResponse,
  GeoChangesResponse,
  GeoCompetitorDetailResponse,
  GeoCompetitorShareResponse,
  GeoCompetitorSuggestionsResponse,
  GeoCompetitorsResponse,
  GeoDiscoverWebsiteResult,
  GeoJourneyDetailResponse,
  GeoLanguageShareResponse,
  GeoModelCatalog,
  GeoOnboardingBrandInput,
  GeoOnboardingBrandResult,
  GeoOverviewResponse,
  GeoProject,
  GeoProjectsResponse,
  GeoIngestSetupResponse,
  GeoPromptHistoryResponse,
  GeoPromptResultsResponse,
  GeoSequenceResultsResponse,
  GeoSettingsResponse,
  GeoSettingsUpsertInput,
  GeoTimeseriesResponse,
  GeoTrackedPromptsResponse,
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
import {
  toGeoTrafficLogPurposeFilter,
  toGeoTrafficLogVisitorFilter,
} from "@notra/geo-core/utils/ai-traffic";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import type { QueryClient } from "@tanstack/react-query";
import {
  keepPreviousData,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { CHART_OTHER_SLICE_LABEL } from "@/constants/charts";
import { localStorageKeys } from "@/constants/storage";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { geoDbOrgQueryKey, geoDbQueryKey } from "@/lib/db/geo-collections";
import type { GeoScanTrigger } from "@/types/analytics/geo-events";
import type {
  GeoGenerateFromWebsiteInput,
  GeoProjectCreateInput,
  GeoPromptSuggestionsResponse,
  GeoRangeQuery,
  GeoSettingsUpsertOptions,
  GeoSuggestionIdInput,
  GeoTrafficLogQueryOptions,
} from "@/types/geo";
import { toErrorMessage } from "@/utils/error-message";
import { geoCompetitorDetailPath } from "@/utils/geo-competitors";
import { describeGeoImportResult } from "@/utils/geo-import";
import { withGeoProject } from "@/utils/geo-paths";
import { toGeoWindowInput } from "@/utils/geo-range";

import { dashboardOrpc } from "../orpc/query";

const GSC_ANALYZE_MUTATION_KEY = "gsc-analyze" as const;

function gscAnalyzeMutationKey(organizationId: string) {
  return [GSC_ANALYZE_MUTATION_KEY, organizationId] as const;
}

async function invalidateCompetitorQueries(
  queryClient: QueryClient,
  organizationId: string,
  projectId: string | undefined
) {
  await Promise.all([
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
      queryKey: dashboardOrpc.geo.promptsList.queryKey({
        input: { organizationId, projectId },
      }),
    }),
    queryClient.invalidateQueries({
      queryKey: geoDbQueryKey("prompts", { organizationId, projectId }),
    }),
  ]);
}

async function invalidateGeoScanResultQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.overview.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.timeseries.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.promptResults.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.changes.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.promptHistory.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.competitorShare.key(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.geo.languageShare.key(),
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
  return useQuery<GeoModelCatalog>({
    ...dashboardOrpc.geo.modelCatalog.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId,
    staleTime: GEO_MODEL_CATALOG_STALE_MS,
    meta: { errorMessage: "Failed to load the model catalog" },
  });
}

export function useGeoSettings(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  const wasScanningRef = useRef<boolean | null>(null);

  const query = useQuery<GeoSettingsResponse>({
    ...dashboardOrpc.geo.settings.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    refetchInterval: (current) =>
      current.state.data?.settings?.isScanning
        ? GEO_SCAN_POLL_INTERVAL_MS
        : false,
    meta: { errorMessage: "Failed to load AI visibility settings" },
  });

  const isScanning = query.data?.settings?.isScanning ?? false;

  useEffect(() => {
    const wasScanning = wasScanningRef.current;
    wasScanningRef.current = isScanning;
    if (wasScanning === true && !isScanning) {
      invalidateGeoScanResultQueries(queryClient).catch(() => undefined);
    }
  }, [isScanning, queryClient]);

  return query;
}

export function useGeoSettingsUpsert(
  organizationId: string,
  options?: GeoSettingsUpsertOptions
) {
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
        toast.success("AI visibility settings saved");
      }
    },
    onError: (error) => {
      trackEvent(POSTHOG_EVENTS.GEO_SETTINGS_SAVE_FAILED);
      toast.error(toErrorMessage(error, "Failed to save settings"));
    },
  });
}

export function useGeoSettingsEngineAdd(organizationId: string) {
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
      toast.error(toErrorMessage(error, "Failed to add model to tracking"));
    },
  });
}

export function useGeoSettingsLanguageAdd(organizationId: string) {
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
      toast.error(toErrorMessage(error, "Failed to add language to tracking"));
    },
  });
}

export function useGeoOverview(organizationId: string, range?: GeoRangeQuery) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoOverviewResponse>({
    ...dashboardOrpc.geo.overview.queryOptions({
      input: { organizationId, projectId, ...toGeoWindowInput(range) },
    }),
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: "Failed to load AI visibility overview" },
  });
}

export function useGeoTimeseries(
  organizationId: string,
  range?: GeoRangeQuery
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoTimeseriesResponse>({
    ...dashboardOrpc.geo.timeseries.queryOptions({
      input: { organizationId, projectId, ...toGeoWindowInput(range) },
    }),
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: "Failed to load AI visibility trend" },
  });
}

export function useGeoPromptResults(
  organizationId: string,
  range?: GeoRangeQuery,
  enabled = true
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoPromptResultsResponse>({
    ...dashboardOrpc.geo.promptResults.queryOptions({
      input: { organizationId, projectId, ...toGeoWindowInput(range) },
    }),
    enabled: enabled && !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: "Failed to load prompt results" },
  });
}

export function useGeoPromptHistory(
  organizationId: string,
  promptId: string,
  options: { enabled: boolean }
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoPromptHistoryResponse>({
    ...dashboardOrpc.geo.promptHistory.queryOptions({
      input: { organizationId, projectId, promptId },
    }),
    enabled: options.enabled && !!organizationId && !!promptId,
    meta: { errorMessage: "Failed to load prompt history" },
  });
}

export function useGeoChanges(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoChangesResponse>({
    ...dashboardOrpc.geo.changes.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: "Failed to load scan changes" },
  });
}

export function useGeoCompetitorShare(
  organizationId: string,
  range?: GeoRangeQuery,
  summaryOnly = false
) {
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
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: "Failed to load competitor share" },
  });
}

export function useGeoCompetitorDetail(
  organizationId: string,
  brand: string | null,
  range?: GeoRangeQuery
) {
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
    meta: { errorMessage: "Failed to load competitor detail" },
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
  projectId?: string
): string {
  if (brand === CHART_OTHER_SLICE_LABEL) {
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

  const openRow = (brand: string) => {
    if (!organizationSlug) {
      return;
    }
    router.push(geoCompetitorRowHref(organizationSlug, brand, projectId));
  };

  const prefetchRow = (brand: string) => {
    if (!organizationSlug) {
      return;
    }
    router.prefetch(geoCompetitorRowHref(organizationSlug, brand, projectId));
    if (brand !== CHART_OTHER_SLICE_LABEL) {
      prefetchDetail(brand);
    }
  };

  return { openRow, prefetchRow };
}

export function useGeoCompetitors(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoCompetitorsResponse>({
    ...dashboardOrpc.geo.competitors.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load competitors" },
  });
}

export function useGeoLanguageShare(
  organizationId: string,
  range?: GeoRangeQuery
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoLanguageShareResponse>({
    ...dashboardOrpc.geo.languageShare.queryOptions({
      input: { organizationId, projectId, ...toGeoWindowInput(range) },
    }),
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: "Failed to load language performance" },
  });
}

export function useGeoPrompts(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoTrackedPromptsResponse>({
    ...dashboardOrpc.geo.promptsList.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load tracked prompts" },
  });
}

export function useGeoGenerateFromWebsite(organizationId: string) {
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
      toast.success("GEO tracking generated from website");
    },
    onError: (error) => {
      toast.error(
        toErrorMessage(error, "Failed to generate GEO tracking from website")
      );
    },
  });
}

export function useGeoImportPrompts(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: GeoPromptImportRow[]) =>
      dashboardOrpc.geo.promptsImport.call({ organizationId, projectId, rows }),
    onSuccess: async (result) => {
      await invalidatePromptQueries(queryClient, organizationId, projectId);
      toast.success(describeGeoImportResult("prompts", result));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to import prompts"));
    },
  });
}

export function useGeoImportCompetitors(organizationId: string) {
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
      toast.success(describeGeoImportResult("competitors", result));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to import competitors"));
    },
  });
}

export function useGeoDiscoverWebsite(
  organizationId: string,
  url: string | null
) {
  return useQuery<GeoDiscoverWebsiteResult>({
    ...dashboardOrpc.geo.discoverWebsite.queryOptions({
      input: { organizationId, url: url ?? "" },
    }),
    enabled: !!organizationId && url !== null,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

export function useGeoOnboardingBrand(organizationId: string) {
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
      toast.error(toErrorMessage(error, "Failed to save your brand"));
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
        queryKey: dashboardOrpc.geo.settings.queryKey({
          input: { organizationId, projectId },
        }),
      });
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to start scan"));
    },
  });
}

export function useGeoRescanPrompt(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: geoStartScanMutationKey(organizationId, projectId),
    mutationFn: (promptId: string) =>
      dashboardOrpc.geo.rescanPrompt.call({
        organizationId,
        projectId,
        promptId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.settings.queryKey({
          input: { organizationId, projectId },
        }),
      });
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to start rescan"));
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
    meta: { errorMessage: "Failed to load agent readiness" },
  });
}

export function useAgentReadinessScan(organizationId: string) {
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
      toast.error(toErrorMessage(error, "Failed to start scan"));
    },
  });
}

export function useAiTraffic(organizationId: string, range?: GeoRangeQuery) {
  const { projectId } = useGeoProjectScope();
  return useQuery<AiTrafficResponse>({
    ...dashboardOrpc.geo.aiTraffic.queryOptions({
      input: { organizationId, projectId, ...toGeoWindowInput(range) },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load AI traffic" },
  });
}

export function useGeoTrafficLog(
  organizationId: string,
  filters: GeoTrafficLogFilters,
  options?: GeoTrafficLogQueryOptions
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoTrafficLogResponse>({
    ...dashboardOrpc.geo.trafficLog.queryOptions({
      input: {
        organizationId,
        projectId,
        limit: AI_TRAFFIC_LOG_FETCH_LIMIT,
        visitorTypes: toGeoTrafficLogVisitorFilter(filters.visitorTypes),
        categories: toGeoTrafficLogPurposeFilter(filters.categories),
      },
    }),
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    refetchInterval: options?.refetchInterval,
    meta: { errorMessage: "Failed to load AI tracking log" },
  });
}

export function useGeoTrafficPages(
  organizationId: string,
  range?: GeoRangeQuery
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoTrafficPagesResponse>({
    ...dashboardOrpc.geo.trafficPages.queryOptions({
      input: {
        organizationId,
        projectId,
        limit: AI_TRAFFIC_PAGES_FETCH_LIMIT,
        ...toGeoWindowInput(range),
      },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load top AI pages" },
  });
}

export function useGeoTrafficJourneys(
  organizationId: string,
  range?: GeoRangeQuery,
  enabled = true
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoTrafficJourneysResponse>({
    ...dashboardOrpc.geo.trafficJourneys.queryOptions({
      input: { organizationId, projectId, ...toGeoWindowInput(range) },
    }),
    enabled: enabled && !!organizationId,
    placeholderData: keepPreviousData,
    meta: { errorMessage: "Failed to load AI journeys" },
  });
}

export function useGeoJourneyDetail(
  organizationId: string,
  journeyId: string | null,
  range?: GeoRangeQuery
) {
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
    meta: { errorMessage: "Failed to load journey detail" },
  });
}

export function useGeoIngestSetup(organizationId: string) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoIngestSetupResponse>({
    ...dashboardOrpc.geo.ingestSetup.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load tracking setup" },
  });
}

export function useGeoIngestTokenRotate(organizationId: string) {
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
      toast.success("Tracking token rotated");
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to rotate the token"));
    },
  });
}

export function useGeoProjects(organizationId: string) {
  return useQuery<GeoProjectsResponse>({
    ...dashboardOrpc.geo.projectsList.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId,
    meta: {
      errorMessage: "Failed to load projects",
      showRetryAction: true,
    },
    refetchInterval: (query) =>
      query.state.status === "error" ? 30_000 : false,
  });
}

export function useGeoProjectCreate(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GeoProjectCreateInput): Promise<GeoProject> =>
      dashboardOrpc.geo.projectsCreate.call({ ...input, organizationId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.projectsList.queryKey({
          input: { organizationId },
        }),
      });
      toast.success("Project created");
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to create project"));
    },
  });
}

export function useGeoProjectDelete(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      dashboardOrpc.geo.projectsDelete.call({ organizationId, projectId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.projectsList.queryKey({
          input: { organizationId },
        }),
      });
      toast.success("Project deleted");
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to delete project"));
    },
  });
}

export function useGeoRunSequence(organizationId: string) {
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
      toast.success(
        `Conversation played against ${engineCount} engine${engineCount === 1 ? "" : "s"}`
      );
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to run the conversation"));
    },
  });
}

export function useGeoSequenceResults(
  organizationId: string,
  sequenceId?: string
) {
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoSequenceResultsResponse>({
    ...dashboardOrpc.geo.sequenceResults.queryOptions({
      input: { organizationId, projectId, sequenceId },
    }),
    enabled: Boolean(organizationId && sequenceId),
    meta: { errorMessage: "Failed to load conversation results" },
  });
}

function describeSyncResult(result: GscSyncResult): string {
  if (result.status !== "completed") {
    return "Search Console sync skipped";
  }
  const added = result.suggestionsAdded ?? 0;
  if (added === 0) {
    return (result.keywords ?? 0) === 0
      ? "Search Console has no search data for this property yet"
      : "Search Console synced — no new prompt suggestions";
  }
  return `${added} new prompt suggestion${added === 1 ? "" : "s"} from Search Console`;
}

export function useGscStatus(organizationId: string) {
  return useQuery<GeoSearchConsoleStatus>({
    ...dashboardOrpc.geo.searchConsoleStatus.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load Search Console status" },
  });
}

export function useGscKeywords(organizationId: string, enabled = true) {
  return useQuery<GscKeywordsResponse>({
    ...dashboardOrpc.geo.searchConsoleKeywords.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId && enabled,
    meta: { errorMessage: "Failed to load Search Console keywords" },
  });
}

export function useGscSites(organizationId: string, enabled: boolean) {
  return useQuery<GscSitesResponse>({
    ...dashboardOrpc.geo.searchConsoleSites.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId && enabled,
    meta: { errorMessage: "Failed to load Search Console properties" },
  });
}

function useInvalidateGscQueries(organizationId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.searchConsoleStatus.queryKey({
          input: { organizationId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.suggestionsList.queryKey({
          input: { organizationId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.searchConsoleKeywords.queryKey({
          input: { organizationId },
        }),
      }),
    ]);
  };
}

export function useGscAnalyzing(organizationId: string): boolean {
  return (
    useIsMutating({
      mutationKey: gscAnalyzeMutationKey(organizationId),
    }) > 0
  );
}

export function useGscSelectSite(organizationId: string) {
  const invalidate = useInvalidateGscQueries(organizationId);
  return useMutation({
    mutationKey: gscAnalyzeMutationKey(organizationId),
    mutationFn: (input: GscSelectSiteInput) =>
      dashboardOrpc.geo.searchConsoleSelectSite.call({
        ...input,
        organizationId,
      }),
    onSuccess: async (result) => {
      await invalidate();
      toast.success(describeSyncResult(result));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to select property"));
    },
  });
}

export function useGscSync(organizationId: string) {
  const invalidate = useInvalidateGscQueries(organizationId);
  return useMutation({
    mutationKey: gscAnalyzeMutationKey(organizationId),
    mutationFn: () =>
      dashboardOrpc.geo.searchConsoleSync.call({ organizationId }),
    onSuccess: async (result) => {
      await invalidate();
      toast.success(describeSyncResult(result));
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to sync Search Console"));
    },
  });
}

export function useGscDisconnect(organizationId: string) {
  const invalidate = useInvalidateGscQueries(organizationId);
  return useMutation({
    mutationFn: () =>
      dashboardOrpc.geo.searchConsoleDisconnect.call({ organizationId }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Google Search Console disconnected");
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to disconnect"));
    },
  });
}

export function useGeoSuggestions(organizationId: string) {
  return useQuery<GeoPromptSuggestionsResponse>({
    ...dashboardOrpc.geo.suggestionsList.queryOptions({
      input: { organizationId },
    }),
    enabled: !!organizationId,
    meta: { errorMessage: "Failed to load prompt suggestions" },
  });
}

function useInvalidateSuggestionQueries(organizationId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.suggestionsList.queryKey({
          input: { organizationId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.promptsList.queryKey({
          input: { organizationId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.writerGaps.queryKey({
          input: { organizationId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: geoDbOrgQueryKey("prompts", organizationId),
      }),
    ]);
  };
}

export function useGeoSuggestionAccept(organizationId: string) {
  const invalidate = useInvalidateSuggestionQueries(organizationId);
  return useMutation({
    mutationFn: (input: GeoSuggestionIdInput) =>
      dashboardOrpc.geo.suggestionAccept.call({ ...input, organizationId }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Prompt added to tracking");
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to add prompt"));
    },
  });
}

export function useGeoSuggestionsAcceptAll(organizationId: string) {
  const invalidate = useInvalidateSuggestionQueries(organizationId);
  return useMutation({
    mutationFn: () =>
      dashboardOrpc.geo.suggestionsAcceptAll.call({ organizationId }),
    onSuccess: async (result) => {
      await invalidate();
      toast.success(
        `${result.accepted} prompt${result.accepted === 1 ? "" : "s"} added to tracking`
      );
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to add prompts"));
    },
  });
}

export function useGeoSuggestionDismiss(organizationId: string) {
  const invalidate = useInvalidateSuggestionQueries(organizationId);
  return useMutation({
    mutationFn: (input: GeoSuggestionIdInput) =>
      dashboardOrpc.geo.suggestionDismiss.call({ ...input, organizationId }),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, "Failed to dismiss suggestion"));
    },
  });
}

const gscCardDismissListeners = new Set<() => void>();

function subscribeToGscCardDismissal(callback: () => void) {
  gscCardDismissListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    gscCardDismissListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function useGscCardDismissal(organizationId: string) {
  const storageKey = localStorageKeys.gscCardDismissed(organizationId);
  const dismissed = useSyncExternalStore(
    subscribeToGscCardDismissal,
    () => localStorage.getItem(storageKey) === "true",
    () => false
  );
  const dismiss = () => {
    localStorage.setItem(storageKey, "true");
    trackEvent(POSTHOG_EVENTS.GSC_CARD_DISMISSED);
    for (const listener of gscCardDismissListeners) {
      listener();
    }
  };
  return { dismiss, dismissed };
}
