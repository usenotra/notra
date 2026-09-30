"use client";

import type { GeoPromptTranslationsResponse } from "@notra/geo-core/types/geo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { dashboardOrpc } from "@/lib/orpc/query";
import { toErrorMessage } from "@/utils/error-message";

export function useGeoPromptTranslations(
  organizationId: string,
  enabled = true
) {
  const tToast = useTranslations("geo.toasts");
  const { projectId } = useGeoProjectScope();
  return useQuery<GeoPromptTranslationsResponse>({
    ...dashboardOrpc.geo.promptTranslations.queryOptions({
      input: { organizationId, projectId },
    }),
    enabled: enabled && !!organizationId,
    // Prompts and languages change elsewhere; always load the current picks.
    staleTime: 0,
    meta: { errorMessage: tToast("loadPromptTranslationsFailed") },
  });
}

/** Every call answers with the full list, so the cache is replaced in place. */
export function useGeoPromptTranslationMutations(organizationId: string) {
  const tToast = useTranslations("geo.toasts");
  const queryClient = useQueryClient();
  const { projectId } = useGeoProjectScope();
  const scope = { organizationId, projectId };
  const onSuccess = (data: GeoPromptTranslationsResponse) => {
    queryClient.setQueryData(
      dashboardOrpc.geo.promptTranslations.queryKey({ input: scope }),
      data
    );
  };
  const onError = (error: Error) => {
    toast.error(toErrorMessage(error, tToast("updatePromptTranslationFailed")));
  };

  const select = useMutation({
    mutationFn: (input: {
      promptId: string;
      language: string;
      selected: boolean;
    }) =>
      dashboardOrpc.geo.promptTranslationSelect.call({ ...input, ...scope }),
    onSuccess,
    onError,
  });
  const update = useMutation({
    mutationFn: (input: { promptId: string; language: string; text: string }) =>
      dashboardOrpc.geo.promptTranslationUpdate.call({ ...input, ...scope }),
    onSuccess,
    onError,
  });
  const reset = useMutation({
    mutationFn: (input: { promptId: string; language: string }) =>
      dashboardOrpc.geo.promptTranslationReset.call({ ...input, ...scope }),
    onSuccess,
    onError,
  });
  const translate = useMutation({
    mutationFn: () => dashboardOrpc.geo.promptTranslationsTranslate.call(scope),
    onSuccess,
    onError: (error: Error) => {
      toast.error(toErrorMessage(error, tToast("translatePromptsFailed")));
    },
  });
  return { select, update, reset, translate };
}
