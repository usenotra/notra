import { recordGenerationOutcome } from "@notra/webhooks/runtime/generation";
import type { Redis } from "@upstash/redis";

import {
  type ContentGenerationJob,
  type ContentGenerationJobEvent,
  type ContentGenerationJobStatus,
  contentGenerationJobEventSchema,
  contentGenerationJobSchema,
} from "./schemas";

const JOB_TTL_SECONDS = 60 * 60 * 24 * 7;
const JOB_LIST_TTL_SECONDS = JOB_TTL_SECONDS;
const EVENT_TTL_SECONDS = JOB_TTL_SECONDS;
const EVENT_LIMIT = 100;
const JOB_LIMIT = 100;

type SerializedJobFields = Record<string, string>;

function parseStoredValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getJobKey(jobId: string) {
  return `content-generation:job:${jobId}`;
}

function getJobEventsKey(jobId: string) {
  return `content-generation:job:${jobId}:events`;
}

function getOrganizationJobsKey(organizationId: string) {
  return `content-generation:org:${organizationId}:jobs`;
}

export function createContentGenerationJobId() {
  return `job_${crypto.randomUUID().replaceAll("-", "")}`;
}

function serializeJobFields(job: ContentGenerationJob): SerializedJobFields {
  return Object.fromEntries(
    Object.entries(job).map(([key, value]) => [key, JSON.stringify(value)])
  );
}

function serializeJobFieldUpdates(updates: Partial<ContentGenerationJob>) {
  return Object.fromEntries(
    Object.entries(updates)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, JSON.stringify(value)])
  );
}

function parseStoredJob(raw: Record<string, unknown>) {
  return contentGenerationJobSchema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, parseStoredValue(value)])
    )
  );
}

export async function createContentGenerationJob(
  redis: Redis,
  job: ContentGenerationJob
) {
  const parsedJob = contentGenerationJobSchema.parse(job);
  const jobKey = getJobKey(parsedJob.id);
  const organizationJobsKey = getOrganizationJobsKey(parsedJob.organizationId);

  const pipeline = redis.pipeline();
  pipeline.hset(jobKey, serializeJobFields(parsedJob));
  pipeline.expire(jobKey, JOB_TTL_SECONDS);
  pipeline.lpush(organizationJobsKey, parsedJob.id);
  pipeline.ltrim(organizationJobsKey, 0, JOB_LIMIT - 1);
  pipeline.expire(organizationJobsKey, JOB_LIST_TTL_SECONDS);
  await pipeline.exec();

  return parsedJob;
}

export async function getContentGenerationJob(redis: Redis, jobId: string) {
  const jobKey = getJobKey(jobId);
  const rawHash = await redis.hgetall<Record<string, unknown>>(jobKey);

  if (rawHash && Object.keys(rawHash).length > 0) {
    return parseStoredJob(rawHash);
  }

  const raw = await redis.get<string>(jobKey);
  if (!raw) {
    return null;
  }

  return contentGenerationJobSchema.parse(parseStoredValue(raw));
}

export async function updateContentGenerationJob(
  redis: Redis,
  jobId: string,
  updates: Partial<ContentGenerationJob>
) {
  const existingJob = await getContentGenerationJob(redis, jobId);
  if (!existingJob) {
    return null;
  }

  const nextJob = contentGenerationJobSchema.parse({
    ...existingJob,
    ...updates,
    id: existingJob.id,
    organizationId: existingJob.organizationId,
    createdAt: existingJob.createdAt,
    updatedAt: new Date().toISOString(),
  });

  if (
    nextJob.status === "completed" ||
    nextJob.status === "failed" ||
    nextJob.status === "skipped"
  ) {
    await recordGenerationOutcome(nextJob);
  }

  await redis.hset(
    getJobKey(jobId),
    serializeJobFieldUpdates({
      ...updates,
      updatedAt: nextJob.updatedAt,
    })
  );
  await redis.expire(getJobKey(jobId), JOB_TTL_SECONDS);

  return nextJob;
}

export async function setContentGenerationJobStatus(
  redis: Redis,
  jobId: string,
  status: ContentGenerationJobStatus,
  updates?: Partial<ContentGenerationJob>
) {
  return updateContentGenerationJob(redis, jobId, {
    ...updates,
    status,
    ...(status === "completed" || status === "failed" || status === "skipped"
      ? { completedAt: new Date().toISOString() }
      : {}),
  });
}

export async function appendContentGenerationJobEvent(
  redis: Redis,
  event: ContentGenerationJobEvent
) {
  const parsedEvent = contentGenerationJobEventSchema.parse(event);
  const eventsKey = getJobEventsKey(parsedEvent.jobId);

  const pipeline = redis.pipeline();
  pipeline.lpush(eventsKey, JSON.stringify(parsedEvent));
  pipeline.ltrim(eventsKey, 0, EVENT_LIMIT - 1);
  pipeline.expire(eventsKey, EVENT_TTL_SECONDS);
  await pipeline.exec();

  return parsedEvent;
}

export async function listContentGenerationJobEvents(
  redis: Redis,
  jobId: string
) {
  const rawEvents =
    (await redis.lrange<string>(getJobEventsKey(jobId), 0, EVENT_LIMIT - 1)) ??
    [];

  return rawEvents
    .map((event) =>
      contentGenerationJobEventSchema.parse(
        typeof event === "string" ? JSON.parse(event) : event
      )
    )
    .reverse();
}
