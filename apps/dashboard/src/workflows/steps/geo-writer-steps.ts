import { runGeoWriter } from "@notra/ai/agents/geo-writer";
import { getValidToneProfile } from "@notra/ai/schemas/tone";
import type { GeoWriterResult } from "@notra/ai/types/geo-writer";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  geoContentBriefs,
  geoSettings,
  projects,
} from "@notra/db/schema";
import {
  GEO_WRITER_TRIGGER_ID,
  GEO_WRITER_TRIGGER_NAME,
} from "@notra/geo-core/constants/geo";
import { briefProvenanceMetadata } from "@notra/geo-core/geo/writer";
import { and, eq } from "drizzle-orm";

import {
  trackGeoWriterCompleted,
  trackGeoWriterFailed,
} from "@/lib/analytics/geo-workflow-events";
import { completeActiveGeneration } from "@/lib/generations/tracking";
import type {
  GeoWriterFailureReason,
  GeoWriterSkippedStepInput,
} from "@/types/analytics/geo-events";
import type { GeoWriterContext } from "@/types/geo";

const BLOG_POST_CONTENT_TYPE = "blog_post";

export async function loadGeoWriterContext(input: {
  organizationId: string;
  projectId: string;
  briefId: string;
  runId: string;
}): Promise<GeoWriterContext | null> {
  "use step";
  const brief = await db.query.geoContentBriefs.findFirst({
    where: and(
      eq(geoContentBriefs.id, input.briefId),
      eq(geoContentBriefs.organizationId, input.organizationId),
      eq(geoContentBriefs.projectId, input.projectId),
      eq(geoContentBriefs.runId, input.runId),
      eq(geoContentBriefs.status, "writing")
    ),
  });
  if (!brief?.collectionId) {
    return null;
  }

  const project = await db.query.projects.findFirst({
    columns: { id: true },
    where: and(
      eq(projects.id, input.projectId),
      eq(projects.organizationId, input.organizationId)
    ),
  });
  if (!project) {
    return null;
  }

  const [brand, settings] = await Promise.all([
    db.query.brandSettings.findFirst({
      columns: {
        companyName: true,
        language: true,
        toneProfile: true,
        customTone: true,
      },
      where: and(
        eq(brandSettings.id, brief.brandSettingsId),
        eq(brandSettings.organizationId, input.organizationId)
      ),
    }),
    db.query.geoSettings.findFirst({
      columns: { companyName: true },
      where: and(
        eq(geoSettings.organizationId, input.organizationId),
        eq(geoSettings.projectId, input.projectId)
      ),
    }),
  ]);

  return {
    organizationId: input.organizationId,
    projectId: input.projectId,
    briefId: brief.id,
    brandSettingsId: brief.brandSettingsId,
    collectionId: brief.collectionId,
    postId: brief.postId,
    brandName:
      settings?.companyName?.trim() ||
      brand?.companyName?.trim() ||
      "the brand",
    language: brand?.language ?? null,
    toneProfile: getValidToneProfile(brand?.toneProfile, "Conversational"),
    customTone: brand?.customTone ?? null,
    topic: brief.topic,
    brief: brief.brief,
    sourceKind: brief.sourceKind,
    sourceId: brief.sourceId,
  };
}

export async function runGeoWriterStep(
  context: GeoWriterContext,
  runId: string
): Promise<GeoWriterResult> {
  "use step";
  return await runGeoWriter({
    organizationId: context.organizationId,
    projectId: context.projectId,
    brandSettingsId: context.brandSettingsId,
    collectionId: context.collectionId,
    postId: context.postId,
    brief: context.brief,
    topic: context.topic,
    brandName: context.brandName,
    toneProfile: context.toneProfile,
    customTone: context.customTone,
    language: context.language,
    sourceMetadata: {
      triggerId: GEO_WRITER_TRIGGER_ID,
      triggerSourceType: "geo",
      prompt: context.brief.targetPrompt,
      brandVoiceId: context.brandSettingsId,
      briefId: context.briefId,
      projectId: context.projectId,
      ...briefProvenanceMetadata({
        brief: context.brief,
        sourceKind: context.sourceKind,
        sourceId: context.sourceId,
      }),
    },
    telemetryMetadata: {
      organizationId: context.organizationId,
      projectId: context.projectId,
      briefId: context.briefId,
      runId,
    },
  });
}

export async function finishGeoWriter(input: {
  organizationId: string;
  projectId: string;
  briefId: string;
  runId: string;
  postId: string;
  title: string;
  humanized: boolean;
}): Promise<void> {
  "use step";
  const updated = await db
    .update(geoContentBriefs)
    .set({
      status: "completed",
      postId: input.postId,
      humanized: input.humanized,
      error: null,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(geoContentBriefs.organizationId, input.organizationId),
        eq(geoContentBriefs.projectId, input.projectId),
        eq(geoContentBriefs.id, input.briefId),
        eq(geoContentBriefs.runId, input.runId),
        eq(geoContentBriefs.status, "writing")
      )
    )
    .returning({ startedAt: geoContentBriefs.startedAt });

  await completeActiveGeneration(input.organizationId, {
    runId: input.runId,
    triggerId: GEO_WRITER_TRIGGER_ID,
    outputType: BLOG_POST_CONTENT_TYPE,
    triggerName: GEO_WRITER_TRIGGER_NAME,
    status: "success",
    title: input.title,
    completedAt: new Date().toISOString(),
    source: "dashboard",
  });

  await trackGeoWriterCompleted({
    organizationId: input.organizationId,
    projectId: input.projectId,
    briefId: input.briefId,
    runId: input.runId,
    postId: input.postId,
    humanized: input.humanized,
    startedAt: updated[0]?.startedAt ?? null,
  });
}

export async function failGeoWriter(input: {
  organizationId: string;
  projectId: string;
  briefId: string;
  runId: string;
  reason: string;
  failureReason: GeoWriterFailureReason;
}): Promise<void> {
  "use step";
  const updated = await db
    .update(geoContentBriefs)
    .set({ status: "failed", error: input.reason, completedAt: new Date() })
    .where(
      and(
        eq(geoContentBriefs.organizationId, input.organizationId),
        eq(geoContentBriefs.projectId, input.projectId),
        eq(geoContentBriefs.id, input.briefId),
        eq(geoContentBriefs.runId, input.runId),
        eq(geoContentBriefs.status, "writing")
      )
    )
    .returning({ startedAt: geoContentBriefs.startedAt });

  await completeActiveGeneration(input.organizationId, {
    runId: input.runId,
    triggerId: GEO_WRITER_TRIGGER_ID,
    outputType: BLOG_POST_CONTENT_TYPE,
    triggerName: GEO_WRITER_TRIGGER_NAME,
    status: "failed",
    reason: input.reason,
    completedAt: new Date().toISOString(),
    source: "dashboard",
  });

  await trackGeoWriterFailed({
    organizationId: input.organizationId,
    projectId: input.projectId,
    briefId: input.briefId,
    runId: input.runId,
    reason: input.failureReason,
    startedAt: updated[0]?.startedAt ?? null,
  });
}

export async function trackGeoWriterSkipped(
  input: GeoWriterSkippedStepInput
): Promise<void> {
  "use step";
  await trackGeoWriterFailed({
    organizationId: input.organizationId,
    projectId: input.projectId,
    briefId: input.briefId,
    runId: input.runId,
    reason: input.reason,
    startedAt: null,
  });
}
