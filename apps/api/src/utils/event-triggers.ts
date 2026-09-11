import { githubIntegrations } from "@notra/db/schema";
import {
  createEventTriggerRequestSchema,
  eventTriggerOutputConfigSchema,
  eventTriggerSourceConfigSchema,
  eventTriggerTargetsSchema,
} from "@notra/schemas/api/event-triggers";
import { and, eq, inArray } from "drizzle-orm";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import type { DbClient } from "../types/db";
import type { EventTriggerRow } from "../types/event-triggers";
import { logError } from "./logging";

export async function ensureEventTriggerTargetsExist(
  db: DbClient,
  organizationId: string,
  repositoryIds: string[],
  message: string
) {
  if (repositoryIds.length === 0) {
    return null;
  }

  const integrations = await db.query.githubIntegrations.findMany({
    where: and(
      eq(githubIntegrations.organizationId, organizationId),
      inArray(githubIntegrations.id, repositoryIds)
    ),
    columns: { id: true },
  });

  const existingIds = new Set(
    integrations.map((integration) => integration.id)
  );
  const missingIds = repositoryIds.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    return { error: message, missingIntegrationIds: missingIds };
  }

  return null;
}

export function serializeEventTrigger(trigger: EventTriggerRow) {
  return {
    id: trigger.id,
    organizationId: trigger.organizationId,
    name: trigger.name,
    sourceType: "github_webhook" as const,
    sourceConfig: eventTriggerSourceConfigSchema.parse(trigger.sourceConfig),
    targets: eventTriggerTargetsSchema.parse(trigger.targets),
    outputType: createEventTriggerRequestSchema.shape.outputType.parse(
      trigger.outputType
    ),
    outputConfig:
      trigger.outputConfig == null
        ? null
        : eventTriggerOutputConfigSchema.parse(trigger.outputConfig),
    enabled: trigger.enabled,
    autoPublish: trigger.autoPublish,
    createdAt: trigger.createdAt.toISOString(),
    updatedAt: trigger.updatedAt.toISOString(),
  };
}

export function safeSerializeEventTrigger(trigger: EventTriggerRow) {
  try {
    return serializeEventTrigger(trigger);
  } catch (error) {
    if (!(error instanceof z.ZodError)) {
      throw error;
    }

    logError(`Skipping malformed event trigger ${trigger.id}`, error);
    return null;
  }
}

export function filterEventTriggersByRepositoryIds(
  triggers: EventTriggerRow[],
  repositoryIds: string[]
) {
  if (repositoryIds.length === 0) {
    return triggers;
  }

  const repositoryIdSet = new Set(repositoryIds);

  return triggers.filter((trigger) => {
    const parsed = eventTriggerTargetsSchema.safeParse(trigger.targets);

    if (!parsed.success) {
      return false;
    }

    return parsed.data.repositoryIds.some((repositoryId) =>
      repositoryIdSet.has(repositoryId)
    );
  });
}
