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
  audience: string | null;
  sourceUrl: string | null;
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
      return data.progress;
    },
    enabled: !!organizationId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) {
        return 2000;
      }
      if (
        data.status === "idle" ||
        data.status === "completed" ||
        data.status === "failed"
      ) {
        return false;
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
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.BRAND.progress(organizationId),
    });
  };

  const onComplete = () => {
    hasReset.current = true;

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

export function useAnalyzeBrand(organizationId: string) {
  const { startPolling } = useBrandAnalysisProgress(organizationId);

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
    onSuccess: () => {
      startPolling();
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
