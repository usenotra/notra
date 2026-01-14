"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { QUERY_KEYS } from "@/utils/query-keys";
import type { UpdateBrandSettingsInput } from "@/utils/schemas/brand";

interface BrandSettings {
  id: string;
  organizationId: string;
  companyName: string | null;
  companyDescription: string | null;
  toneProfile: string | null;
  customTone: string | null;
  customInstructions: string | null;
  audience: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BrandSettingsResponse {
  settings: BrandSettings | null;
}

type ProgressStatus =
  | "idle"
  | "scraping"
  | "extracting"
  | "saving"
  | "completed"
  | "failed";

interface Progress {
  status: ProgressStatus;
  currentStep: number;
  totalSteps: number;
  error?: string;
}

interface ProgressResponse {
  progress: Progress;
}

export function useBrandSettings(organizationId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.BRAND.settings(organizationId),
    queryFn: async (): Promise<BrandSettingsResponse> => {
      const res = await fetch(`/api/organizations/${organizationId}/brand`);
      if (!res.ok) {
        throw new Error("Failed to fetch brand settings");
      }
      return res.json();
    },
    enabled: !!organizationId,
  });
}

export function useBrandAnalysisProgress(organizationId: string) {
  const queryClient = useQueryClient();
  const hasReset = useRef(false);
  const forcePollUntilMs = useRef<number | null>(null);

  const shouldForcePoll = () => {
    const untilMs = forcePollUntilMs.current;
    return typeof untilMs === "number" && Date.now() < untilMs;
  };

  const query = useQuery({
    queryKey: QUERY_KEYS.BRAND.progress(organizationId),
    queryFn: async (): Promise<Progress> => {
      const res = await fetch(
        `/api/organizations/${organizationId}/brand/progress`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch progress");
      }

      const data: ProgressResponse = await res.json();

      // If the backend is momentarily still "idle" right after starting
      // an analysis, keep any optimistic non-idle state (e.g. "scraping")
      // so the UI can show the stepper immediately.
      if (data.progress.status === "idle" && shouldForcePoll()) {
        const cached = queryClient.getQueryData<Progress>(
          QUERY_KEYS.BRAND.progress(organizationId)
        );
        if (cached && cached.status !== "idle") {
          return cached;
        }
      }

      if (data.progress.status !== "idle") {
        forcePollUntilMs.current = null;
      }

      return data.progress;
    },
    enabled: !!organizationId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) {
        return 2000;
      }

      if (data.status === "completed" || data.status === "failed") {
        return false;
      }

      if (data.status === "idle") {
        return shouldForcePoll() ? 1000 : false;
      }

      return 1000;
    },
  });

  const progress = query.data ?? {
    status: "idle" as const,
    currentStep: 0,
    totalSteps: 3,
  };

  const startPolling = () => {
    hasReset.current = false;
    forcePollUntilMs.current = Date.now() + 15_000;

    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.BRAND.progress(organizationId),
    });
  };

  const onComplete = () => {
    hasReset.current = true;
    forcePollUntilMs.current = null;

    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.BRAND.settings(organizationId),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AUTH.organizations,
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AUTH.activeOrganization,
    });
  };

  if (progress.status === "completed" && !hasReset.current) {
    onComplete();
  }

  return { progress, startPolling };
}

export function useAnalyzeBrand(
  organizationId: string,
  startPolling: () => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch(
        `/api/organizations/${organizationId}/brand/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to start analysis");
      }
      return res.json();
    },
    onMutate: () => {
      queryClient.setQueryData(QUERY_KEYS.BRAND.progress(organizationId), {
        status: "scraping",
        currentStep: 1,
        totalSteps: 3,
      });

      startPolling();
    },
    onSuccess: () => {
      startPolling();
    },
    onError: (error) => {
      queryClient.setQueryData(QUERY_KEYS.BRAND.progress(organizationId), {
        status: "failed",
        currentStep: 0,
        totalSteps: 3,
        error: error instanceof Error ? error.message : "Analysis failed",
      });
    },
  });
}

export function useUpdateBrandSettings(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBrandSettingsInput) => {
      const res = await fetch(`/api/organizations/${organizationId}/brand`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update brand settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BRAND.settings(organizationId),
      });
    },
  });
}
