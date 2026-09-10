import { redis } from "@notra/ai/utils/redis";

import type {
  IntegrationType,
  Log,
  LogRetentionDays,
  WebhookLogInput,
} from "@/types/webhooks/webhooks";

const LOG_TTL_7_DAYS = 60 * 60 * 24 * 7;
const LOG_TTL_14_DAYS = 60 * 60 * 24 * 14;
const LOG_TTL_30_DAYS = 60 * 60 * 24 * 30;
const LOG_LIMIT = 200;

export function getLogTtlSeconds(retentionDays: LogRetentionDays) {
  if (retentionDays === 30) {
    return LOG_TTL_30_DAYS;
  }
  if (retentionDays === 14) {
    return LOG_TTL_14_DAYS;
  }
  return LOG_TTL_7_DAYS;
}

function getLogKey(
  organizationId: string,
  integrationType: IntegrationType,
  integrationId: string
) {
  return `webhook-logs:${organizationId}:${integrationType}:${integrationId}`;
}

function getAllLogKey(organizationId: string) {
  return `webhook-logs:${organizationId}:all`;
}

export async function appendWebhookLog(input: WebhookLogInput) {
  const log: Log & { payload?: Record<string, unknown> | null } = {
    id: `log_${crypto.randomUUID().slice(0, 8)}`,
    integrationId: input.integrationId,
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
    const payloadSummary = input.payload
      ? ` payload=${JSON.stringify(input.payload)}`
      : "";
    console.info(
      `[WebhookLog] ${input.integrationType} ${input.status} ${input.title}${payloadSummary}`
    );
    return log;
  }

  const retentionDays = input.retentionDays ?? 30;
  const ttlSeconds = getLogTtlSeconds(retentionDays);

  const key = getLogKey(
    input.organizationId,
    input.integrationType,
    input.integrationId
  );
  const allKey = getAllLogKey(input.organizationId);

  const pipeline = redis.pipeline();
  pipeline.lpush(key, log);
  pipeline.ltrim(key, 0, LOG_LIMIT - 1);
  pipeline.expire(key, ttlSeconds);
  pipeline.lpush(allKey, log);
  pipeline.ltrim(allKey, 0, LOG_LIMIT - 1);
  pipeline.expire(allKey, ttlSeconds);
  await pipeline.exec();

  return log;
}

export async function listWebhookLogs(
  organizationId: string,
  integrationType: IntegrationType,
  integrationId?: string | null
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
