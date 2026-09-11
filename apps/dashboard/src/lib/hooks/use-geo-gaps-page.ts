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
import type { GeoGapsPageModel } from "@/types/components/geo-gaps";
import type { WriteDialogInitialState } from "@/types/components/geo-writer";
import {
  resolveGeoGapsPageStatus,
  toGeoGapsPageModel,
} from "@/utils/geo-gaps-page";
import { resolveOrganizationId } from "@/utils/geo-overview-organization";
import {
  emptyWriteDialogState,
  geoContentPath,
  writeDialogStateFromGap,
} from "@/utils/geo-write-entry";

export function useGeoGapsPage(organizationSlug: string): GeoGapsPageModel {
  const router = useRouter();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const organizationId = resolveOrganizationId(
    organizationSlug,
    activeOrganization,
    getOrganization(organizationSlug)
  );

  const settingsQuery = useGeoSettings(organizationId);
  const { data: settingsData, isPending: isSettingsPending } = settingsQuery;
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

  const onRetry = useCallback(() => {
    if (settingsQuery.isError) {
      void settingsQuery.refetch();
    }
    if (gapsQuery.isError) {
      void gapsQuery.refetch();
    }
  }, [gapsQuery, settingsQuery]);

  return toGeoGapsPageModel({
    status: resolveGeoGapsPageStatus({
      settingsError: settingsQuery.isError,
      hasSettingsData: Boolean(settingsData),
      hasSettings: Boolean(settingsData?.settings),
      settingsPending: isSettingsPending,
      gapsError: gapsQuery.isError,
      hasGapsData: Boolean(gapsQuery.data),
    }),
    error: {
      isRetrying: settingsQuery.isFetching || gapsQuery.isFetching,
      onRetry,
    },
    empty: { organizationId },
    ready: {
      organizationId,
      organizationSlug,
      isGapsPending: gapsQuery.isPending,
      table: {
        competitors: competitorsQuery.data?.competitors ?? [],
        hasScanData: gapsQuery.data?.hasScanData ?? false,
        isScanning,
        onOpenPost: (postId) => {
          router.push(geoContentPath(organizationSlug, postId));
        },
        onRescanPrompt: (row) => rescanPrompt.mutate(row.id),
        onRunScan: () => startScan.mutate("gaps_empty"),
        onWritePrompt: (row) => {
          openDialog(
            writeDialogStateFromGap({
              promptId: row.id,
              prompt: row.prompt,
              mentionedEngines: row.mentionedEngines,
              missingEngines: row.engines,
              mentionedCompetitors: [
                ...row.competitors,
                ...row.discoveredCompetitors,
              ],
            })
          );
        },
        dismissingSearchId: dismissSuggestion.isPending
          ? (dismissSuggestion.variables?.suggestionId ?? null)
          : null,
        onDismissSearch: (row) => {
          dismissSuggestion.mutate(
            { suggestionId: row.id },
            {
              onSuccess: () => {
                toast.success(GEO_SEARCH_GAP_DISMISSED_TOAST);
              },
            }
          );
        },
        onWriteSearch: (row, existingPageUrl) => {
          openDialog({
            sourceKind: "search_console",
            sourceId: row.id,
            topic: row.prompt,
            existingPageUrl,
          });
        },
        organizationSlug,
        promptGaps: gapsQuery.data?.promptGaps ?? [],
        searchGaps: gapsQuery.data?.searchGaps ?? [],
      },
      dialog: {
        open: dialogOpen,
        initial: dialogInitial,
        onOpenChange: setDialogOpen,
      },
    },
  });
}
