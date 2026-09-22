import {
  createBrandAnalysisJob,
  createBrandAnalysisJobId,
  setBrandAnalysisJobStatus,
  updateBrandAnalysisJob,
} from "@notra/ai/jobs/brand-analysis";
import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { brandSettings } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { after } from "next/server";

import { startBrandAnalysisRun } from "@/lib/workflows/start";
import type {
  DispatchBrandAnalysisInput,
  InsertBrandIdentityInput,
  QueueBrandAnalysisInput,
  QueueBrandAnalysisResult,
} from "@/types/brand-analysis";
import { isDefaultBrandConstraintViolation } from "@/utils/brand-settings";

async function insertBrandIdentity({
  organizationId,
  brandName,
  websiteUrl,
}: InsertBrandIdentityInput): Promise<{ id: string }> {
  const hasAnyBrandIdentity = await db.query.brandSettings.findFirst({
    where: eq(brandSettings.organizationId, organizationId),
    columns: { id: true },
  });

  const baseValues = {
    id: crypto.randomUUID(),
    organizationId,
    name: brandName,
    websiteUrl,
  };

  try {
    const [row] = await db
      .insert(brandSettings)
      .values({ ...baseValues, isDefault: !hasAnyBrandIdentity })
      .returning({ id: brandSettings.id });
    if (row) {
      return row;
    }
  } catch (error) {
    if (!isDefaultBrandConstraintViolation(error)) {
      throw error;
    }
  }

  const [fallback] = await db
    .insert(brandSettings)
    .values({ ...baseValues, id: crypto.randomUUID(), isDefault: false })
    .returning({ id: brandSettings.id });

  if (!fallback) {
    throw new Error("Failed to create brand identity");
  }
  return fallback;
}

async function dispatchBrandAnalysisWorkflow({
  organizationId,
  websiteUrl,
  brandIdentityId,
  jobId,
}: DispatchBrandAnalysisInput) {
  if (!redis) {
    return;
  }

  const now = new Date().toISOString();

  try {
    await createBrandAnalysisJob(redis, {
      id: jobId,
      organizationId,
      brandIdentityId,
      status: "queued",
      step: null,
      currentStep: 0,
      totalSteps: 3,
      workflowRunId: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });

    const result = await startBrandAnalysisRun({
      organizationId,
      url: websiteUrl,
      voiceId: brandIdentityId,
      jobId,
    });

    await updateBrandAnalysisJob(redis, jobId, {
      workflowRunId: result.runId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to trigger workflow";

    console.error("[Onboarding] Brand analysis workflow dispatch failed", {
      organizationId,
      brandIdentityId,
      jobId,
      error: message,
    });

    if (redis) {
      await setBrandAnalysisJobStatus(redis, jobId, "failed", {
        step: null,
        currentStep: 0,
        totalSteps: 3,
        error: message,
      });
    }
  }
}

export async function queueBrandAnalysisForOnboarding({
  organizationId,
  websiteUrl,
  name,
}: QueueBrandAnalysisInput): Promise<QueueBrandAnalysisResult | null> {
  const jobId = createBrandAnalysisJobId();
  const brandName = name?.trim() || "Untitled Brand Voice";

  const brandIdentity = await insertBrandIdentity({
    organizationId,
    brandName,
    websiteUrl,
  });

  if (!redis) {
    return { jobId, brandIdentityId: brandIdentity.id };
  }

  after(() =>
    dispatchBrandAnalysisWorkflow({
      organizationId,
      websiteUrl,
      brandIdentityId: brandIdentity.id,
      jobId,
    })
  );

  return { jobId, brandIdentityId: brandIdentity.id };
}
