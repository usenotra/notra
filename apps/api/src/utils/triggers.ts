import type { createDb } from "@notra/db/drizzle";
import { contentTriggers } from "@notra/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

import { deleteQstashWithRetry, qstashLayer } from "../lib/qstash";
import { logError } from "./logging";
import { runServiceEffect } from "./run-service-effect";

type DbClient = ReturnType<typeof createDb>;
type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export type IntegrationTrigger = Awaited<
  ReturnType<typeof getTriggersForIntegration>
>[number];

export async function getTriggersForBrandIdentity(
  db: DbClient,
  organizationId: string,
  brandIdentityId: string
) {
  const allTriggers = await db.query.contentTriggers.findMany({
    where: eq(contentTriggers.organizationId, organizationId),
    columns: {
      id: true,
      name: true,
      sourceType: true,
      outputConfig: true,
      qstashScheduleId: true,
    },
  });

  return allTriggers.filter((trigger) => {
    const config = trigger.outputConfig as {
      brandVoiceId?: string;
    } | null;

    return config?.brandVoiceId === brandIdentityId;
  });
}

export async function getTriggersForIntegration(
  db: DbClient,
  organizationId: string,
  integrationId: string
) {
  // Triggers currently persist both GitHub integration IDs and Linear selections
  // inside targets.repositoryIds. Linear values are stored with a `linear:` prefix.
  const allTriggers = await db.query.contentTriggers.findMany({
    where: eq(contentTriggers.organizationId, organizationId),
    columns: {
      id: true,
      name: true,
      sourceType: true,
      targets: true,
      qstashScheduleId: true,
    },
  });

  return allTriggers.filter((trigger) => {
    const targets = trigger.targets as
      | {
          repositoryIds?: string[];
        }
      | undefined;

    if (!targets?.repositoryIds?.length) {
      return false;
    }

    return targets.repositoryIds.some(
      (targetId) =>
        targetId === integrationId || targetId === `linear:${integrationId}`
    );
  });
}

export async function disableTriggersAndDeleteIntegration(
  db: DbClient,
  organizationId: string,
  affectedTriggers: IntegrationTrigger[],
  deleteIntegration: (tx: DbTransaction) => Promise<unknown>
) {
  await db.transaction(async (tx) => {
    if (affectedTriggers.length > 0) {
      await tx
        .update(contentTriggers)
        .set({
          enabled: false,
          qstashScheduleId: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contentTriggers.organizationId, organizationId),
            inArray(
              contentTriggers.id,
              affectedTriggers.map((trigger) => trigger.id)
            )
          )
        );
    }

    await deleteIntegration(tx);
  });
}

export async function deleteQstashScheduleWithRetry(
  runtimeEnv: { QSTASH_TOKEN?: string; WORKFLOW_BASE_URL?: string },
  scheduleId: string,
  attempts = 3
) {
  return runServiceEffect(
    deleteQstashWithRetry(scheduleId, attempts).pipe(
      Effect.provide(qstashLayer(runtimeEnv))
    )
  );
}

export async function deleteQstashSchedulesForTriggers(
  runtimeEnv: { QSTASH_TOKEN?: string; WORKFLOW_BASE_URL?: string },
  affectedTriggers: readonly { qstashScheduleId: string | null }[]
) {
  for (const trigger of affectedTriggers) {
    if (!trigger.qstashScheduleId) {
      continue;
    }

    try {
      await deleteQstashScheduleWithRetry(runtimeEnv, trigger.qstashScheduleId);
    } catch (error) {
      logError(
        `Failed to delete qstash schedule ${trigger.qstashScheduleId}`,
        error
      );
    }
  }
}
