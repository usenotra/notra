import { recordBrandAnalysisOutcome } from "@notra/webhooks/runtime/brand-analysis";
import type { Redis } from "@upstash/redis";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

const JOB_TTL_SECONDS = 60 * 60 * 24;

export const brandAnalysisJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
]);

export const brandAnalysisJobSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  brandIdentityId: z.string(),
  status: brandAnalysisJobStatusSchema,
  step: z.enum(["scraping", "extracting", "saving"]).nullable(),
  currentStep: z.number().int().min(0),
  totalSteps: z.number().int().min(1),
  workflowRunId: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export type BrandAnalysisJobStatus = z.infer<
  typeof brandAnalysisJobStatusSchema
>;
export type BrandAnalysisJob = z.infer<typeof brandAnalysisJobSchema>;

function getJobKey(jobId: string) {
  return `brand-analysis:job:${jobId}`;
}

function serializeJobFields(job: BrandAnalysisJob) {
  return Object.fromEntries(
    Object.entries(job).map(([key, value]) => [key, JSON.stringify(value)])
  );
}

function serializeJobFieldUpdates(updates: Partial<BrandAnalysisJob>) {
  return Object.fromEntries(
    Object.entries(updates)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, JSON.stringify(value)])
  );
}

function parseStoredJob(raw: Record<string, unknown>) {
  const parseValue = (value: unknown) => {
    if (typeof value !== "string") {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  return brandAnalysisJobSchema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, parseValue(value)])
    )
  );
}

export function createBrandAnalysisJobId() {
  return `brand_job_${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function createBrandAnalysisJob(
  redis: Redis,
  job: BrandAnalysisJob
) {
  const parsedJob = brandAnalysisJobSchema.parse(job);
  await redis.hset(getJobKey(parsedJob.id), serializeJobFields(parsedJob));
  await redis.expire(getJobKey(parsedJob.id), JOB_TTL_SECONDS);
  return parsedJob;
}

export async function getBrandAnalysisJob(redis: Redis, jobId: string) {
  const rawHash = await redis.hgetall<Record<string, unknown>>(
    getJobKey(jobId)
  );

  if (!rawHash || Object.keys(rawHash).length === 0) {
    return null;
  }

  return parseStoredJob(rawHash);
}

export async function updateBrandAnalysisJob(
  redis: Redis,
  jobId: string,
  updates: Partial<BrandAnalysisJob>
) {
  const existingJob = await getBrandAnalysisJob(redis, jobId);
  if (!existingJob) {
    return null;
  }

  const nextJob = brandAnalysisJobSchema.parse({
    ...existingJob,
    ...updates,
    id: existingJob.id,
    organizationId: existingJob.organizationId,
    brandIdentityId: existingJob.brandIdentityId,
    createdAt: existingJob.createdAt,
    updatedAt: new Date().toISOString(),
  });

  await redis.hset(
    getJobKey(jobId),
    serializeJobFieldUpdates({
      ...updates,
      updatedAt: nextJob.updatedAt,
    })
  );
  await redis.expire(getJobKey(jobId), JOB_TTL_SECONDS);

  if (nextJob.status === "completed" || nextJob.status === "failed") {
    await recordBrandAnalysisOutcome(nextJob);
  }

  return nextJob;
}

export async function setBrandAnalysisJobStatus(
  redis: Redis,
  jobId: string,
  status: BrandAnalysisJobStatus,
  updates?: Partial<BrandAnalysisJob>
) {
  return updateBrandAnalysisJob(redis, jobId, {
    ...updates,
    status,
    ...(status === "completed" || status === "failed"
      ? { completedAt: new Date().toISOString() }
      : {}),
  });
}
