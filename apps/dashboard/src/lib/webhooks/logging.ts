import type { IntegrationType, Log } from "@/types/webhook-logs";
import { redis } from "@/lib/redis";

const LOG_TTL_7_DAYS = 60 * 60 * 24 * 7;
const LOG_TTL_30_DAYS = 60 * 60 * 24 * 30;
const LOG_LIMIT = 200;

export type LogRetentionDays = 7 | 30;

export function getLogTtlSeconds(retentionDays: LogRetentionDays): number {
  return retentionDays === 30 ? LOG_TTL_30_DAYS : LOG_TTL_7_DAYS;
}

export interface WebhookLogInput {
  organizationId: string;
  integrationId: string;
  integrationType: IntegrationType;
  title: string;
  status: "success" | "failed" | "pending";
  statusCode: number | null;
  referenceId?: string | null;
  errorMessage?: string | null;
  payload?: Record<string, unknown> | null;
  retentionDays?: LogRetentionDays;
}

function getLogKey(
  organizationId: string,
  integrationType: IntegrationType,
  integrationId: string,
) {
  return `webhook-logs:${organizationId}:${integrationType}:${integrationId}`;
}

function getAllLogKey(organizationId: string) {
  return `webhook-logs:${organizationId}:all`;
}

export async function appendWebhookLog(input: WebhookLogInput) {
  const log: Log & { payload?: Record<string, unknown> | null } = {
    id: `log_${crypto.randomUUID().slice(0, 8)}`,
    referenceId: input.referenceId ?? null,
    title: input.title,
    integrationType: input.integrationType,
    direction: "incoming",
    status: input.status,
    statusCode: input.statusCode,
    errorMessage: input.errorMessage ?? null,
    createdAt: new Date().toISOString(),
    payload: input.payload ?? null,
  };

  if (!redis) {
    return log;
  }

  const retentionDays = input.retentionDays ?? 30;
  const ttlSeconds = getLogTtlSeconds(retentionDays);

  const key = getLogKey(
    input.organizationId,
    input.integrationType,
    input.integrationId,
  );
  const allKey = getAllLogKey(input.organizationId);

  await redis.lpush(key, log);
  await redis.ltrim(key, 0, LOG_LIMIT - 1);
  await redis.expire(key, ttlSeconds);

  await redis.lpush(allKey, log);
  await redis.ltrim(allKey, 0, LOG_LIMIT - 1);
  await redis.expire(allKey, ttlSeconds);

  return log;
}

export async function listWebhookLogs(
  organizationId: string,
  integrationType: IntegrationType,
  integrationId?: string | null,
) {
  if (!redis) {
    return [];
  }

  const key = integrationId
    ? getLogKey(organizationId, integrationType, integrationId)
    : getAllLogKey(organizationId);

  const logs = await redis.lrange<
    Log & { payload?: Record<string, unknown> | null }
  >(key, 0, LOG_LIMIT - 1);

  return logs ?? [];
}
