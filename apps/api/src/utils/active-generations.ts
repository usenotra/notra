import type { Redis } from "@upstash/redis";

const ACTIVE_KEY_PREFIX = "generations:active";
const ACTIVE_TTL_SECONDS = 600;

interface ActiveGenerationRecord {
  runId: string;
  triggerId: string;
  outputType: string;
  triggerName: string;
  startedAt: string;
  source?: "api" | "dashboard";
}

function getActiveKey(organizationId: string) {
  return `${ACTIVE_KEY_PREFIX}:${organizationId}`;
}

export async function addActiveGeneration(
  redis: Redis,
  organizationId: string,
  generation: ActiveGenerationRecord
) {
  const key = getActiveKey(organizationId);
  const pipeline = redis.pipeline();
  pipeline.hset(key, { [generation.runId]: JSON.stringify(generation) });
  pipeline.expire(key, ACTIVE_TTL_SECONDS);
  await pipeline.exec();
}

export async function removeActiveGeneration(
  redis: Redis,
  organizationId: string,
  runId: string
) {
  const key = getActiveKey(organizationId);
  await redis.hdel(key, runId);
}
