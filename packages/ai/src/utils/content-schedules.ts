import type { TriggerCronConfig } from "@notra/ai/qstash/triggers";
import {
  buildCronExpression,
  createQstashSchedule,
  deleteQstashSchedule,
  normalizeCronConfig,
} from "@notra/ai/qstash/triggers";
import {
  SCHEDULE_FREQUENCIES,
  SCHEDULE_LOOKBACK_WINDOWS,
  type CreateScheduleInput,
} from "@notra/ai/schemas/schedules";
import type {
  ContentScheduleSummary,
  CreateContentScheduleResult,
} from "@notra/ai/types/schedules";
import { hashTrigger } from "@notra/ai/utils/trigger-hash";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  contentTriggerLookbackWindows,
  contentTriggers,
  githubIntegrations,
} from "@notra/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { customAlphabet } from "nanoid";

const generateScheduleId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  16
);
const DEDUPE_CONSTRAINT = "contentTriggers_organization_dedupe_uidx";
const DEFAULT_LOOKBACK_WINDOW = "last_7_days";
const DEFAULT_SCHEDULE_NAME = "Untitled Schedule";

const storedCronSchemaFields = {
  frequency: SCHEDULE_FREQUENCIES,
  lookback: SCHEDULE_LOOKBACK_WINDOWS,
} as const;

interface ScheduleRow {
  id: string;
  name: string;
  enabled: boolean;
  autoPublish: boolean;
  outputType: string;
  sourceConfig: unknown;
  targets: unknown;
  outputConfig: unknown;
}

function contentScheduleDedupeHash(input: {
  cron: TriggerCronConfig;
  repositoryIds: string[];
  outputType: string;
  lookbackWindow: string;
  instructions?: string;
  brandVoiceId?: string;
}): string {
  return hashTrigger({
    sourceType: "cron",
    sourceConfig: { cron: input.cron },
    targets: { repositoryIds: input.repositoryIds },
    outputType: input.outputType,
    lookbackWindow: input.lookbackWindow,
    instructions: input.instructions,
    brandVoiceId: input.brandVoiceId,
  });
}

function scheduleAutoPublish(input: CreateScheduleInput): boolean {
  return (
    input.autoPublish &&
    (input.outputType === "changelog" || input.outputType === "blog_post")
  );
}

export async function listContentSchedules(
  organizationId: string
): Promise<ContentScheduleSummary[]> {
  const triggers = await db.query.contentTriggers.findMany({
    where: and(
      eq(contentTriggers.organizationId, organizationId),
      eq(contentTriggers.sourceType, "cron")
    ),
    orderBy: (items, { desc }) => [desc(items.createdAt)],
  });

  return summarizeRows(organizationId, triggers);
}

export async function createContentSchedule(
  organizationId: string,
  input: CreateScheduleInput
): Promise<CreateContentScheduleResult> {
  const repositories = await loadScheduleRepositories(
    organizationId,
    input.repositoryIds
  );
  if ("message" in repositories) {
    return { status: "error", message: repositories.message };
  }

  if (input.brandVoiceId) {
    const voice = await db.query.brandSettings.findFirst({
      where: and(
        eq(brandSettings.organizationId, organizationId),
        eq(brandSettings.id, input.brandVoiceId)
      ),
      columns: { id: true },
    });
    if (!voice) {
      return {
        status: "error",
        message:
          "That brand voice does not belong to this workspace. Use an id from listBrandIdentities, or omit brandVoiceId.",
      };
    }
  }

  const cron = normalizeCronConfig({
    frequency: input.frequency,
    hour: input.hour,
    minute: input.minute,
    dayOfWeek: "dayOfWeek" in input ? input.dayOfWeek : undefined,
    dayOfMonth: "dayOfMonth" in input ? input.dayOfMonth : undefined,
    intervalDays: "intervalDays" in input ? input.intervalDays : undefined,
    anchorDate: "anchorDate" in input ? input.anchorDate : undefined,
  });
  if (!cron) {
    return { status: "error", message: "That cadence cannot be scheduled." };
  }

  const cronExpression = buildCronExpression(cron);
  if (!cronExpression) {
    return { status: "error", message: "That cadence cannot be scheduled." };
  }

  const repositoryIds = repositories.map((repository) => repository.id);
  const autoPublish = scheduleAutoPublish(input);
  const dedupeHash = contentScheduleDedupeHash({
    cron,
    repositoryIds,
    outputType: input.outputType,
    lookbackWindow: input.lookbackWindow,
    instructions: input.instructions,
    brandVoiceId: input.brandVoiceId,
  });

  const existing = await findScheduleByHash(organizationId, dedupeHash);
  if (existing) {
    const [schedule] = await summarizeRows(organizationId, [existing]);
    if (schedule) {
      return { status: "duplicate", schedule };
    }
  }

  const triggerId = generateScheduleId();
  let qstashScheduleId: string | null = null;

  try {
    if (input.enabled) {
      qstashScheduleId = await createQstashSchedule({
        triggerId,
        cron: cronExpression,
      });
    }

    const outputConfig = scheduleOutputConfig(input);
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(contentTriggers)
        .values({
          id: triggerId,
          organizationId,
          name: input.name.trim() || DEFAULT_SCHEDULE_NAME,
          sourceType: "cron",
          sourceConfig: { cron },
          targets: { repositoryIds },
          outputType: input.outputType,
          outputConfig,
          dedupeHash,
          enabled: input.enabled,
          autoPublish,
          qstashScheduleId,
        })
        .returning({ id: contentTriggers.id });

      if (!created) {
        throw new Error("Failed to create schedule");
      }

      await tx.insert(contentTriggerLookbackWindows).values({
        triggerId,
        window: input.lookbackWindow,
      });
    });
  } catch (error) {
    if (qstashScheduleId) {
      await deleteQstashSchedule(qstashScheduleId).catch((cleanupError) => {
        console.error("Error deleting schedule:", cleanupError);
      });
    }

    if (isDedupeConflict(error)) {
      const raced = await findScheduleByHash(organizationId, dedupeHash);
      if (raced) {
        const [schedule] = await summarizeRows(organizationId, [raced]);
        if (schedule) {
          return { status: "duplicate", schedule };
        }
      }
    }

    const setupMessage = scheduleSetupMessage(error);
    if (setupMessage) {
      return { status: "error", message: setupMessage };
    }

    throw error;
  }

  const [schedule] = await summarizeRows(organizationId, [
    {
      id: triggerId,
      name: input.name.trim() || DEFAULT_SCHEDULE_NAME,
      enabled: input.enabled,
      autoPublish,
      outputType: input.outputType,
      sourceConfig: { cron },
      targets: { repositoryIds },
      outputConfig: scheduleOutputConfig(input),
    },
  ]);

  if (!schedule) {
    throw new Error("Failed to create schedule");
  }

  return { status: "created", schedule };
}

function scheduleOutputConfig(input: CreateScheduleInput) {
  if (!(input.instructions || input.brandVoiceId)) {
    return null;
  }

  return {
    ...(input.brandVoiceId ? { brandVoiceId: input.brandVoiceId } : {}),
    ...(input.instructions ? { instructions: input.instructions } : {}),
  };
}

async function findScheduleByHash(organizationId: string, dedupeHash: string) {
  return db.query.contentTriggers.findFirst({
    where: and(
      eq(contentTriggers.organizationId, organizationId),
      eq(contentTriggers.dedupeHash, dedupeHash),
      eq(contentTriggers.sourceType, "cron")
    ),
  });
}

async function loadScheduleRepositories(
  organizationId: string,
  repositoryIds: string[]
) {
  const uniqueIds = [...new Set(repositoryIds)];
  const rows = await db.query.githubIntegrations.findMany({
    where: and(
      eq(githubIntegrations.organizationId, organizationId),
      inArray(githubIntegrations.id, uniqueIds)
    ),
    columns: {
      id: true,
      owner: true,
      repo: true,
      enabled: true,
      repositoryEnabled: true,
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const missing = uniqueIds.filter((id) => {
    const row = byId.get(id);
    return !(row?.enabled && row.repositoryEnabled);
  });

  if (missing.length > 0) {
    return {
      message:
        "These repository IDs are not enabled GitHub repositories in this workspace. Use integrationId values from the prompt or getAvailableIntegrations.",
    };
  }

  return uniqueIds.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

async function summarizeRows(
  organizationId: string,
  rows: ScheduleRow[]
): Promise<ContentScheduleSummary[]> {
  if (rows.length === 0) {
    return [];
  }

  const triggerIds = rows.map((row) => row.id);
  const repositoryIds = [
    ...new Set(rows.flatMap((row) => readRepositoryIds(row.targets))),
  ];

  const [lookbacks, repositories] = await Promise.all([
    db.query.contentTriggerLookbackWindows.findMany({
      where: inArray(contentTriggerLookbackWindows.triggerId, triggerIds),
    }),
    repositoryIds.length > 0
      ? db.query.githubIntegrations.findMany({
          where: and(
            eq(githubIntegrations.organizationId, organizationId),
            inArray(githubIntegrations.id, repositoryIds)
          ),
          columns: { id: true, owner: true, repo: true },
        })
      : Promise.resolve([]),
  ]);

  const lookbackByTriggerId = new Map(
    lookbacks.map((item) => [item.triggerId, item.window])
  );
  const repositoryLabelById = new Map(
    repositories.map((repository) => [
      repository.id,
      repository.owner && repository.repo
        ? `${repository.owner}/${repository.repo}`
        : repository.id,
    ])
  );

  return rows.map((row) =>
    toSummary(row, lookbackByTriggerId, repositoryLabelById)
  );
}

function toSummary(
  row: ScheduleRow,
  lookbackByTriggerId: Map<string, string>,
  repositoryLabelById: Map<string, string>
): ContentScheduleSummary {
  const cron = readCron(row.sourceConfig);
  const repositoryIds = readRepositoryIds(row.targets);
  const outputConfig = readOutputConfig(row.outputConfig);
  const lookback = lookbackByTriggerId.get(row.id);

  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    autoPublish: row.autoPublish,
    outputType: row.outputType,
    lookbackWindow: isLookbackWindow(lookback)
      ? lookback
      : DEFAULT_LOOKBACK_WINDOW,
    frequency: cron?.frequency ?? null,
    hour: cron?.hour ?? null,
    minute: cron?.minute ?? null,
    dayOfWeek: cron?.dayOfWeek ?? null,
    dayOfMonth: cron?.dayOfMonth ?? null,
    intervalDays: cron?.intervalDays ?? null,
    anchorDate: cron?.anchorDate ?? null,
    repositoryIds,
    repositories: repositoryIds.map((id) => repositoryLabelById.get(id) ?? id),
    instructions: outputConfig.instructions,
    brandVoiceId: outputConfig.brandVoiceId,
  };
}

function readCron(sourceConfig: unknown): TriggerCronConfig | null {
  if (!sourceConfig || typeof sourceConfig !== "object") {
    return null;
  }
  const cron = (sourceConfig as { cron?: unknown }).cron;
  if (!cron || typeof cron !== "object") {
    return null;
  }
  const record = cron as Record<string, unknown>;
  const frequency = record.frequency;
  if (
    typeof frequency !== "string" ||
    !storedCronSchemaFields.frequency.includes(
      frequency as (typeof SCHEDULE_FREQUENCIES)[number]
    )
  ) {
    return null;
  }
  if (typeof record.hour !== "number" || typeof record.minute !== "number") {
    return null;
  }

  return {
    frequency: frequency as TriggerCronConfig["frequency"],
    hour: record.hour,
    minute: record.minute,
    ...(typeof record.dayOfWeek === "number"
      ? { dayOfWeek: record.dayOfWeek }
      : {}),
    ...(typeof record.dayOfMonth === "number"
      ? { dayOfMonth: record.dayOfMonth }
      : {}),
    ...(typeof record.intervalDays === "number"
      ? { intervalDays: record.intervalDays }
      : {}),
    ...(typeof record.anchorDate === "string"
      ? { anchorDate: record.anchorDate }
      : {}),
  };
}

function readRepositoryIds(targets: unknown): string[] {
  if (!targets || typeof targets !== "object") {
    return [];
  }
  const repositoryIds = (targets as { repositoryIds?: unknown }).repositoryIds;
  if (!Array.isArray(repositoryIds)) {
    return [];
  }
  return repositoryIds.filter((id): id is string => typeof id === "string");
}

function readOutputConfig(outputConfig: unknown): {
  instructions: string | null;
  brandVoiceId: string | null;
} {
  if (!outputConfig || typeof outputConfig !== "object") {
    return { instructions: null, brandVoiceId: null };
  }
  const record = outputConfig as {
    instructions?: unknown;
    brandVoiceId?: unknown;
  };
  return {
    instructions:
      typeof record.instructions === "string" ? record.instructions : null,
    brandVoiceId:
      typeof record.brandVoiceId === "string" ? record.brandVoiceId : null,
  };
}

function isLookbackWindow(
  value: string | undefined
): value is (typeof SCHEDULE_LOOKBACK_WINDOWS)[number] {
  return (
    value !== undefined &&
    storedCronSchemaFields.lookback.includes(
      value as (typeof SCHEDULE_LOOKBACK_WINDOWS)[number]
    )
  );
}

function scheduleSetupMessage(error: unknown): string | null {
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("QSTASH_TOKEN") ||
    message.includes("App URL not configured") ||
    message.includes("invalid destination") ||
    message.includes("unable to resolve host")
  ) {
    return "Schedules cannot be started yet because the scheduler is not configured for this environment.";
  }
  return null;
}

function isDedupeConflict(error: unknown): boolean {
  for (let current = error, depth = 0; current && depth < 6; depth++) {
    if (typeof current === "object") {
      const record = current as { code?: unknown; constraint?: unknown };
      if (record.code === "23505" && record.constraint === DEDUPE_CONSTRAINT) {
        return true;
      }
      if (
        current instanceof Error &&
        current.message.includes(DEDUPE_CONSTRAINT)
      ) {
        return true;
      }
      current = "cause" in current ? current.cause : undefined;
      continue;
    }
    return false;
  }
  return false;
}
