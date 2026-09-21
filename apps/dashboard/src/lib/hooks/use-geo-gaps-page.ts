"use client";

import {
  GEO_PROMPT_GAP_IGNORED_TOAST,
  GEO_PROMPT_GAP_RESTORED_TOAST,
  GEO_SEARCH_GAP_DISMISSED_TOAST,
} from "@notra/geo-core/constants/geo";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useGeoRescanPrompt,
  useGeoSettings,
  useGeoStartScan,
  useGeoSuggestionDismiss,
  useIsGeoScanning,
} from "@/lib/hooks/use-geo";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import {
  useGeoPromptGapIgnore,
  useGeoWriterGaps,
} from "@/lib/hooks/use-geo-writer";
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
  const { competitors } = useGeoCompetitorsDb(organizationId);
  const startScan = useGeoStartScan(organizationId);
  const rescanPrompt = useGeoRescanPrompt(organizationId);
  const isScanning = useIsGeoScanning(organizationId);
  const dismissSuggestion = useGeoSuggestionDismiss(organizationId);
  const ignoreGap = useGeoPromptGapIgnore(organizationId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitial, setDialogInitial] =
    useState<WriteDialogInitialState | null>(null);

  const openDialog = (initial?: WriteDialogInitialState) => {
    setDialogInitial(initial ?? emptyWriteDialogState());
    setDialogOpen(true);
  };

  const onRetry = () => {
    if (settingsQuery.isError) {
      void settingsQuery.refetch();
    }
    if (gapsQuery.isError) {
      void gapsQuery.refetch();
    }
  };

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
        competitors,
        organizationId,
        hasScanData: gapsQuery.data?.hasScanData ?? false,
        isScanning,
        onOpenPost: (postId) => {
          router.push(geoContentPath(organizationSlug, postId));
        },
        onRescanPrompt: (row) => rescanPrompt.mutate(row.id),
        ignoringPromptId:
          ignoreGap.isPending && ignoreGap.variables?.ignored
            ? ignoreGap.variables.promptId
            : null,
        // `mutate` callbacks only fire for the latest call, so ignoring two gaps
        // quickly would drop the first Undo toast. Each `mutateAsync` call
        // settles on its own promise; failures are toasted by the hook.
        onIgnorePrompt: async (row) => {
          try {
            await ignoreGap.mutateAsync({ promptId: row.id, ignored: true });
          } catch {
            return;
          }
          toast.success(GEO_PROMPT_GAP_IGNORED_TOAST, {
            action: {
              label: "Undo",
              onClick: async () => {
                try {
                  await ignoreGap.mutateAsync({
                    promptId: row.id,
                    ignored: false,
                  });
                } catch {
                  return;
                }
                toast.success(GEO_PROMPT_GAP_RESTORED_TOAST);
              },
            },
          });
        },
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
