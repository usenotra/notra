"use client";

import type {
  CreateGuidelineAssetInput,
  CreateGuidelineColorInput,
  UpdateGuidelineAssetInput,
  UpdateGuidelineColorInput,
  UpdateGuidelineFontInput,
  UpdateGuidelineScreenshotInput,
  UpdateGuidelineTokenInput,
} from "@notra/schemas/dashboard/brand-guidelines";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { BRAND_GUIDELINE_POLL_INTERVAL_MS } from "@/constants/brand-guidelines";
import type { BrandGuidelinesResponse } from "@/types/hooks/brand-guidelines";

import { dashboardOrpc } from "../orpc/query";

function guidelinesGetKey(organizationId: string, voiceId: string) {
  return dashboardOrpc.brand.guidelines.get.queryKey({
    input: { organizationId, voiceId },
  });
}

function useGuidelineMutation<TInput = void>(input: {
  mutationFn: (payload: TInput) => Promise<BrandGuidelinesResponse>;
  organizationId: string;
  voiceId: string;
  onSettled?: (queryClient: QueryClient) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: input.mutationFn,
    onSuccess: (data) => {
      queryClient.setQueryData(
        guidelinesGetKey(input.organizationId, input.voiceId),
        data
      );
    },
    onSettled: () => {
      input.onSettled?.(queryClient);
    },
  });
}

export function useBrandGuidelines(organizationId: string, voiceId: string) {
  return useQuery<BrandGuidelinesResponse>({
    ...dashboardOrpc.brand.guidelines.get.queryOptions({
      input: { organizationId, voiceId },
      enabled: !!organizationId && !!voiceId,
    }),
    refetchInterval: (query) => {
      const status = query.state.data?.guideline?.status;
      return status === "queued" || status === "generating"
        ? BRAND_GUIDELINE_POLL_INTERVAL_MS
        : false;
    },
  });
}

export function useRefreshBrandGuidelines(
  organizationId: string,
  voiceId: string
) {
  return useGuidelineMutation({
    mutationFn: () =>
      dashboardOrpc.brand.guidelines.refresh.call({ organizationId, voiceId }),
    organizationId,
    onSettled: (queryClient) => {
      queryClient.invalidateQueries({
        queryKey: guidelinesGetKey(organizationId, voiceId),
      });
    },
    voiceId,
  });
}

export function useRefreshBrandGuidelinesAction(
  organizationId: string,
  voiceId: string
) {
  const refresh = useRefreshBrandGuidelines(organizationId, voiceId);

  const refreshGuidelines = async () => {
    if (refresh.isPending) {
      return;
    }

    try {
      await refresh.mutateAsync();
      toast.success("Guideline generation started");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh guidelines"
      );
    }
  };

  return { ...refresh, refreshGuidelines };
}

export function useUpdateGuidelineColor(
  organizationId: string,
  voiceId: string
) {
  return useGuidelineMutation<UpdateGuidelineColorInput>({
    mutationFn: (input) =>
      dashboardOrpc.brand.guidelines.updateColor.call({
        organizationId,
        voiceId,
        ...input,
      }),
    organizationId,
    voiceId,
  });
}

export function useUpdateGuidelineFont(
  organizationId: string,
  voiceId: string
) {
  return useGuidelineMutation<UpdateGuidelineFontInput>({
    mutationFn: (input) =>
      dashboardOrpc.brand.guidelines.updateFont.call({
        organizationId,
        voiceId,
        ...input,
      }),
    organizationId,
    voiceId,
  });
}

export function useUpdateGuidelineToken(
  organizationId: string,
  voiceId: string
) {
  return useGuidelineMutation<UpdateGuidelineTokenInput>({
    mutationFn: (input) =>
      dashboardOrpc.brand.guidelines.updateToken.call({
        organizationId,
        voiceId,
        ...input,
      }),
    organizationId,
    voiceId,
  });
}

export function useUpdateGuidelineAsset(
  organizationId: string,
  voiceId: string
) {
  return useGuidelineMutation<UpdateGuidelineAssetInput>({
    mutationFn: (input) =>
      dashboardOrpc.brand.guidelines.updateAsset.call({
        organizationId,
        voiceId,
        ...input,
      }),
    organizationId,
    voiceId,
  });
}

export function useUpdateGuidelineScreenshot(
  organizationId: string,
  voiceId: string
) {
  return useGuidelineMutation<UpdateGuidelineScreenshotInput>({
    mutationFn: (input) =>
      dashboardOrpc.brand.guidelines.updateScreenshot.call({
        organizationId,
        voiceId,
        ...input,
      }),
    organizationId,
    voiceId,
  });
}

export function useCreateGuidelineColor(
  organizationId: string,
  voiceId: string
) {
  return useGuidelineMutation<CreateGuidelineColorInput>({
    mutationFn: (input) =>
      dashboardOrpc.brand.guidelines.createColor.call({
        organizationId,
        voiceId,
        ...input,
      }),
    organizationId,
    voiceId,
  });
}

export function useCreateGuidelineAsset(
  organizationId: string,
  voiceId: string
) {
  return useGuidelineMutation<CreateGuidelineAssetInput>({
    mutationFn: (input) =>
      dashboardOrpc.brand.guidelines.createAsset.call({
        organizationId,
        voiceId,
        ...input,
      }),
    organizationId,
    voiceId,
  });
}
