import crypto from "node:crypto";

import { toUtcDateString } from "@notra/ai/utils/schedule-interval";
import { githubIntegrations } from "@notra/db/schema";
import {
  createScheduleRequestSchema,
  scheduleOutputConfigSchema,
  scheduleSourceConfigSchema,
  scheduleTargetsRepositoryIdsSchema,
  scheduleTargetsSchema,
} from "@notra/schemas/api/schedules";
import { QstashError } from "@notra/schemas/api/qstash";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import type { ScheduleDatabaseError } from "../errors/schedules";
import type { DbClient } from "../types/db";
import type {
  CreateScheduleBody,
  ScheduleDomainError,
  ScheduleTriggerRow,
  ScheduleTriggerWithLookbackWindow,
} from "../types/schedules";
import { logError } from "./logging";

export const DEFAULT_SCHEDULE_NAME = "Untitled Schedule";

/** Leave unexpected database errors to Hono's central error handler. */
export function runScheduleProgram<A, E extends ScheduleDomainError>(
  program: Effect.Effect<A, E | ScheduleDatabaseError>
) {
  return Effect.runPromise(
    Effect.result(
      program.pipe(
        Effect.catchTag("ScheduleDatabaseError", (failure) =>
          Effect.die(failure.cause)
        )
      )
    )
  );
}

function normalizeCronConfig(
  config: CreateScheduleBody["sourceConfig"]["cron"]
) {
  const base = {
    frequency: config.frequency,
    hour: config.hour,
    minute: config.minute,
  } as const;

  if (config.frequency === "weekly") {
    return {
      ...base,
      dayOfWeek: config.dayOfWeek ?? 1,
    };
  }

  if (config.frequency === "monthly") {
    return {
      ...base,
      dayOfMonth: config.dayOfMonth ?? 1,
    };
  }

  if (config.frequency === "custom") {
    return {
      ...base,
      intervalDays: config.intervalDays,
      anchorDate: config.anchorDate ?? toUtcDateString(new Date()),
    };
  }

  return base;
}

export function normalizeSchedule(input: CreateScheduleBody) {
  return {
    ...input,
    sourceConfig: {
      cron: normalizeCronConfig(input.sourceConfig.cron),
    },
    targets: {
      repositoryIds: [...input.targets.repositoryIds].sort(),
    },
  };
}

export function hashSchedule(input: CreateScheduleBody) {
  const normalized = normalizeSchedule(input);

  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        sourceType: normalized.sourceType,
        sourceConfig: normalized.sourceConfig,
        targets: normalized.targets,
        outputType: normalized.outputType,
        outputConfig: normalized.outputConfig ?? null,
        lookbackWindow: normalized.lookbackWindow,
      })
    )
    .digest("hex");
}

export async function ensureScheduleTargetsExist(
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

export function serializeSchedule(trigger: ScheduleTriggerWithLookbackWindow) {
  return {
    id: trigger.id,
    organizationId: trigger.organizationId,
    name: trigger.name,
    sourceType: "cron" as const,
    sourceConfig: scheduleSourceConfigSchema.parse(trigger.sourceConfig),
    targets: scheduleTargetsSchema.parse(trigger.targets),
    outputType: createScheduleRequestSchema.shape.outputType.parse(
      trigger.outputType
    ),
    outputConfig:
      trigger.outputConfig == null
        ? null
        : scheduleOutputConfigSchema.parse(trigger.outputConfig),
    enabled: trigger.enabled,
    autoPublish: trigger.autoPublish,
    createdAt: trigger.createdAt.toISOString(),
    updatedAt: trigger.updatedAt.toISOString(),
    lookbackWindow: trigger.lookbackWindow,
  };
}

export function safeSerializeSchedule(
  trigger: Parameters<typeof serializeSchedule>[0]
) {
  try {
    return serializeSchedule(trigger);
  } catch (error) {
    if (!(error instanceof z.ZodError)) {
      throw error;
    }

    logError(`Skipping malformed schedule ${trigger.id}`, error);
    return null;
  }
}

export function isQstashScheduleError(error: unknown) {
  if (error instanceof QstashError) {
    return true;
  }

  const message = error instanceof Error ? error.message : "Unknown error";

  return (
    message.includes("invalid destination") ||
    message.includes("unable to resolve host") ||
    message.includes("WORKFLOW_BASE_URL is not configured") ||
    message.includes("QStash returned an unexpected")
  );
}

export function mapQstashError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (
    message.includes("invalid destination") ||
    message.includes("unable to resolve host") ||
    message.includes("WORKFLOW_BASE_URL is not configured")
  ) {
    return { error: "External URL not configured", status: 400 as const };
  }

  return { error: "Failed to configure schedule", status: 500 as const };
}

export function filterSchedulesByRepositoryIds(
  triggers: ScheduleTriggerRow[],
  repositoryIds: string[]
) {
  if (repositoryIds.length === 0) {
    return triggers;
  }

  const repositoryIdSet = new Set(repositoryIds);

  return triggers.filter((trigger) => {
    const parsed = scheduleTargetsRepositoryIdsSchema.safeParse(
      trigger.targets
    );

    if (!parsed.success) {
      return false;
    }

    return parsed.data.repositoryIds.some((repositoryId) =>
      repositoryIdSet.has(repositoryId)
    );
  });
}
