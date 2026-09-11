"use client";

import type { UpdateBrandSettingsInput } from "@notra/schemas/dashboard/brand";
import type {
  AffectedTriggersData,
  DeleteResourceResponse,
} from "@notra/schemas/dashboard/integrations";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import type {
  BrandSettings,
  BrandSettingsResponse,
  ProgressResponse,
} from "@/types/hooks/brand-analysis";
import { QUERY_KEYS } from "@/utils/query-keys";

import { dashboardOrpc } from "../orpc/query";

const IDLE_PROGRESS: ProgressResponse["progress"] = {
  status: "idle",
  currentStep: 0,
  totalSteps: 3,
};

export function useBrandSettings(organizationId: string) {
  return useQuery<BrandSettingsResponse>(
    dashboardOrpc.brand.voices.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId,
    })
  );
}

export function useBrandAnalysisProgress(
  organizationId: string,
  onFailure?: (error: string) => void,
  onAnalysisComplete?: () => void
) {
  const queryClient = useQueryClient();
  const hasReset = useRef(false);
  const forcePollUntilMs = useRef<number | null>(null);
  const lastFailureMessage = useRef<string | null>(null);
  const progressKey = dashboardOrpc.brand.analysis.getProgress.queryKey({
    input: { organizationId },
  });

  const shouldForcePoll = () => {
    const untilMs = forcePollUntilMs.current;
    return typeof untilMs === "number" && Date.now() < untilMs;
  };

  const query = useQuery<ProgressResponse>({
    queryKey: progressKey,
    queryFn: async () => {
      const data = await dashboardOrpc.brand.analysis.getProgress.call({
        organizationId,
      });
      const progress = data.progress;

      if (progress.status === "idle" && shouldForcePoll()) {
        const cached = queryClient.getQueryData<ProgressResponse>(progressKey);
        if (cached && cached.progress.status !== "idle") {
          return cached;
        }
      }

      return data;
    },
    enabled: !!organizationId,
    refetchInterval: (query) => {
      const progress = query.state.data?.progress;
      if (!progress) {
        return 2000;
      }

      if (progress.status === "completed" || progress.status === "failed") {
        return false;
      }

      if (progress.status === "idle") {
        return shouldForcePoll() ? 1000 : false;
      }

      return 1000;
    },
  });

  const progress = query.data?.progress ?? IDLE_PROGRESS;

  const startPolling = () => {
    hasReset.current = false;
    forcePollUntilMs.current = Date.now() + 15_000;

    queryClient.invalidateQueries({
      queryKey: progressKey,
    });
  };

  const onComplete = useCallback(() => {
    hasReset.current = true;
    forcePollUntilMs.current = null;

    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.brand.voices.list.queryKey({
        input: { organizationId },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AUTH.organizations,
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AUTH.activeOrganization,
    });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.onboarding.get.queryKey({
        input: { organizationId },
      }),
    });
    onAnalysisComplete?.();
  }, [onAnalysisComplete, organizationId, queryClient]);

  useEffect(() => {
    if (
      progress.status === "failed" &&
      progress.error &&
      lastFailureMessage.current !== progress.error
    ) {
      onFailure?.(progress.error);
      lastFailureMessage.current = progress.error;
    }

    if (progress.status !== "failed" && lastFailureMessage.current) {
      lastFailureMessage.current = null;
    }

    if (progress.status !== "idle") {
      forcePollUntilMs.current = null;
    }

    if (progress.status === "completed" && !hasReset.current) {
      onComplete();
    }
  }, [onComplete, onFailure, progress]);

  return { progress, startPolling };
}

export function useAnalyzeBrand(
  organizationId: string,
  startPolling: () => void
) {
  const queryClient = useQueryClient();
  const progressKey = dashboardOrpc.brand.analysis.getProgress.queryKey({
    input: { organizationId },
  });

  return useMutation({
    mutationFn: async (params: { url: string; voiceId?: string }) => {
      return dashboardOrpc.brand.analysis.start.call({
        organizationId,
        url: params.url,
        voiceId: params.voiceId,
      });
    },
    onMutate: () => {
      queryClient.setQueryData(progressKey, {
        progress: {
          status: "scraping",
          currentStep: 1,
          totalSteps: 3,
        },
      });

      startPolling();
    },
    onSuccess: () => {
      startPolling();
    },
    onError: (error) => {
      queryClient.setQueryData(progressKey, {
        progress: {
          status: "failed",
          currentStep: 0,
          totalSteps: 3,
          error: error instanceof Error ? error.message : "Analysis failed",
        },
      });
    },
  });
}

export function useUpdateBrandSettings(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBrandSettingsInput) => {
      if (!data.id) {
        throw new Error("Voice ID is required");
      }

      const { id, ...updates } = data;

      return dashboardOrpc.brand.voices.update.call({
        organizationId,
        voiceId: id,
        ...updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.brand.voices.list.queryKey({
          input: { organizationId },
        }),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.onboarding.get.queryKey({
          input: { organizationId },
        }),
      });
    },
  });
}

export function useCreateBrandVoice(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      websiteUrl: string;
    }): Promise<{ voice: BrandSettings }> => {
      return dashboardOrpc.brand.voices.create.call({
        organizationId,
        ...params,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.brand.voices.list.queryKey({
          input: { organizationId },
        }),
      });
    },
  });
}

export function useBrandVoiceAffectedTriggers(
  organizationId: string,
  voiceId: string,
  enabled: boolean
) {
  const query = useQuery<AffectedTriggersData>({
    queryKey: dashboardOrpc.brand.voices.affectedTriggers.queryKey({
      input: { organizationId, voiceId },
    }),
    queryFn: async () => {
      return dashboardOrpc.brand.voices.affectedTriggers.call({
        organizationId,
        voiceId,
      });
    },
    enabled: enabled && !!voiceId,
  });

  return { ...query, isLoading: query.isLoading || query.isFetching };
}

export function useDeleteBrandVoice(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation<DeleteResourceResponse, Error, string>({
    mutationFn: async (voiceId: string) => {
      return dashboardOrpc.brand.voices.delete.call({
        organizationId,
        voiceId,
      });
    },
    onSuccess: (_data, voiceId) => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.brand.voices.list.queryKey({
          input: { organizationId },
        }),
      });
      queryClient.removeQueries({
        queryKey: dashboardOrpc.brand.voices.affectedTriggers.queryKey({
          input: { organizationId, voiceId },
        }),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.automation.key(),
      });
    },
  });
}

export function useSetDefaultBrandVoice(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voiceId: string) => {
      return dashboardOrpc.brand.voices.setDefault.call({
        organizationId,
        voiceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.brand.voices.list.queryKey({
          input: { organizationId },
        }),
      });
    },
  });
}
