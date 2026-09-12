import { GEO_WRITER_TRIGGER_ID } from "@notra/geo-core/constants/geo";
import type { GeoContentBriefSummary } from "@notra/geo-core/types/geo";
import { sourceMetadataSchema } from "@notra/schemas/dashboard/content";

import type {
  GeoGapsWriteEntry,
  WriteDialogInitialState,
} from "@/types/components/geo-writer";

/**
 * GEO write entry helpers.
 *
 * Gaps Write opens `WriteDialog` with `writeDialogStateFromGap`, then
 * navigates to `geoContentPath(slug, postId)` after plan.
 * Do not `router.push("/${slug}/geo/write?brief=")`. Topic is resolved
 * server-side from `geo_prompts` via `sourceKind` + `sourceId`.
 */
export function geoContentPath(
  organizationSlug: string,
  postId: string
): string {
  return `/${organizationSlug}/content/${postId}`;
}

export function writeDialogStateFromGap(
  input: GeoGapsWriteEntry
): WriteDialogInitialState {
  const mentioned = input.mentionedEngines?.length ?? 0;
  const missing = input.missingEngines?.length ?? 0;
  const total = mentioned + missing;
  return {
    sourceKind: "gap",
    sourceId: input.promptId,
    topic: input.prompt,
    baseline:
      total > 0 ? { mentionedEngines: mentioned, totalEngines: total } : null,
    mentionedCompetitors: [...(input.mentionedCompetitors ?? [])],
  };
}

export function emptyWriteDialogState(): WriteDialogInitialState {
  return { sourceKind: "manual" };
}

export function briefDisplayTitle(
  brief: Pick<GeoContentBriefSummary, "workingTitle" | "topic">
): string {
  const title = brief.workingTitle.trim();
  return title || brief.topic;
}

export function parseGeoWriterDraft(sourceMetadata: unknown): {
  briefId: string;
  projectId?: string;
} | null {
  const parsed = sourceMetadataSchema.safeParse(sourceMetadata);
  if (!parsed.success || !parsed.data) {
    return null;
  }
  if (parsed.data.triggerId !== GEO_WRITER_TRIGGER_ID || !parsed.data.briefId) {
    return null;
  }
  return {
    briefId: parsed.data.briefId,
    projectId: parsed.data.projectId,
  };
}

export function isGeoWriterPlanReviewable(status: string | undefined): boolean {
  return status === "draft" || status === "failed";
}
