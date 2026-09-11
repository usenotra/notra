"use client";

import { GEO_SEARCH_GAP_DISMISSED_TOAST } from "@notra/geo-core/constants/geo";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useGeoCompetitors,
  useGeoRescanPrompt,
  useGeoSettings,
  useGeoStartScan,
  useGeoSuggestionDismiss,
  useIsGeoScanning,
} from "@/lib/hooks/use-geo";
import { useGeoWriterGaps } from "@/lib/hooks/use-geo-writer";
import type { WriteDialogInitialState } from "@/types/components/geo-writer";
import {
  emptyWriteDialogState,
  geoContentPath,
  writeDialogStateFromGap,
} from "@/utils/geo-write-entry";
import { resolveOrganizationId } from "@/utils/geo-overview-organization";

export function useGeoGapsPage(organizationSlug: string) {
  const router = useRouter();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const organizationId = resolveOrganizationId(
    organizationSlug,
    activeOrganization,
    getOrganization(organizationSlug)
  );

  const settingsQuery = useGeoSettings(organizationId);
  const gapsQuery = useGeoWriterGaps(organizationId);
  const competitorsQuery = useGeoCompetitors(organizationId);
  const startScan = useGeoStartScan(organizationId);
  const rescanPrompt = useGeoRescanPrompt(organizationId);
  const isScanning = useIsGeoScanning(organizationId);
  const dismissSuggestion = useGeoSuggestionDismiss(organizationId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitial, setDialogInitial] =
    useState<WriteDialogInitialState | null>(null);

  const openDialog = useCallback((initial?: WriteDialogInitialState) => {
    setDialogInitial(initial ?? emptyWriteDialogState());
    setDialogOpen(true);
  }, []);

  const retry = useCallback(() => {
    if (settingsQuery.isError) {
      void settingsQuery.refetch();
    }
    if (gapsQuery.isError) {
      void gapsQuery.refetch();
    }
  }, [gapsQuery, settingsQuery]);

  const openPost = useCallback(
    (postId: string) => {
      router.push(geoContentPath(organizationSlug, postId));
    },
    [organizationSlug, router]
  );

  const writePrompt = useCallback(
    (row: {
      id: string;
      prompt: string;
      mentionedEngines: readonly string[];
      engines: readonly string[];
      competitors: readonly string[];
      discoveredCompetitors: readonly string[];
    }) => {
      openDialog(
        writeDialogStateFromGap({
          promptId: row.id,
          prompt: row.prompt,
          mentionedEngines: row.mentionedEngines,
          missingEngines: row.engines,
          mentionedCompetitors: [...row.competitors, ...row.discoveredCompetitors],
        })
      );
    },
    [openDialog]
  );

  const dismissSearch = useCallback(
    (suggestionId: string) => {
      dismissSuggestion.mutate(
        { suggestionId },
        {
          onSuccess: () => {
            toast.success(GEO_SEARCH_GAP_DISMISSED_TOAST);
          },
        }
      );
    },
    [dismissSuggestion]
  );

  const writeSearch = useCallback(
    (
      row: { id: string; prompt: string },
      existingPageUrl: string | undefined
    ) => {
      openDialog({
        sourceKind: "search_console",
        sourceId: row.id,
        topic: row.prompt,
        existingPageUrl,
      });
    },
    [openDialog]
  );

  const { data: settingsData, isPending: isSettingsPending } = settingsQuery;

  if (
    (settingsQuery.isError && !settingsData) ||
    (settingsData?.settings && gapsQuery.isError && !gapsQuery.data)
  ) {
    return {
      status: "error" as const,
      isRetrying: settingsQuery.isFetching || gapsQuery.isFetching,
      retry,
    };
  }

  if (!(isSettingsPending || settingsData?.settings)) {
    return {
      status: "setup" as const,
      organizationId,
    };
  }

  if (isSettingsPending && !gapsQuery.data) {
    return { status: "loading" as const };
  }

  return {
    status: "ready" as const,
    organizationId,
    organizationSlug,
    gapsQuery,
    competitors: competitorsQuery.data?.competitors ?? [],
    isScanning,
    startScan,
    rescanPrompt,
    dismissSuggestion,
    dialogOpen,
    dialogInitial,
    setDialogOpen,
    openPost,
    writePrompt,
    dismissSearch,
    writeSearch,
    runScan: () => startScan.mutate("gaps_empty"),
    rescanPromptRow: (promptId: string) => rescanPrompt.mutate(promptId),
  };
}
