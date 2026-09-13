import type { GeoContentBrief } from "@notra/ai/types/geo-writer";
import { geoBriefToMarkdown } from "@notra/geo-core/utils/geo-writer-brief-markdown";
import type { QueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";
import { getConflictRevision } from "@/utils/orpc-errors";

interface UpdateGeoWriterPlanParams {
  briefId: string;
  expectedUpdatedAt: string;
  nextBrief: GeoContentBrief;
  organizationId: string;
  contentId: string;
  queryClient: QueryClient;
  geoWriterUpdate: {
    mutate: (
      input: {
        briefId: string;
        expectedUpdatedAt: string;
        markdown: string;
        workingTitle: string;
      },
      options: {
        onSuccess: () => void;
        onError: (error: unknown) => void;
      }
    ) => void;
  };
  onSuccess: (markdown: string) => void;
  onConflict: () => void;
}

export function updateGeoWriterPlan({
  briefId,
  expectedUpdatedAt,
  nextBrief,
  organizationId,
  contentId,
  queryClient,
  geoWriterUpdate,
  onSuccess,
  onConflict,
}: UpdateGeoWriterPlanParams) {
  const markdown = geoBriefToMarkdown(nextBrief);
  geoWriterUpdate.mutate(
    {
      briefId,
      expectedUpdatedAt,
      markdown,
      workingTitle: nextBrief.workingTitle,
    },
    {
      onSuccess: () => {
        onSuccess(markdown);
        queryClient
          .invalidateQueries({
            queryKey: dashboardOrpc.content.get.queryKey({
              input: { organizationId, contentId },
            }),
          })
          .catch(() => undefined);
      },
      onError: (error) => {
        if (getConflictRevision(error).isConflict) {
          onConflict();
        }
      },
    }
  );
}
