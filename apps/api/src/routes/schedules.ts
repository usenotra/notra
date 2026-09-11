import crypto from "node:crypto";

import { createRoute } from "@hono/zod-openapi";
import { toUtcDateString } from "@notra/ai/utils/schedule-interval";
import type { createDb } from "@notra/db/drizzle";
import {
  contentTriggerLookbackWindows,
  contentTriggers,
  githubIntegrations,
} from "@notra/db/schema";
import {
  createScheduleRequestSchema,
  scheduleTargetsRepositoryIdsSchema,
  deleteScheduleResponseSchema,
  getSchedulesQuerySchema,
  getSchedulesResponseSchema,
  patchScheduleRequestSchema,
  scheduleOutputConfigSchema,
  scheduleParamsSchema,
  scheduleResponseSchema,
  scheduleSourceConfigSchema,
  scheduleTargetsSchema,
} from "@notra/schemas/api/schedules";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import type {
  ScheduleTriggerRow,
  ScheduleTriggerWithLookbackWindow,
} from "../types/schedules";
import { getOrganizationId } from "../utils/auth";
import { logError } from "../utils/logging";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse } from "../utils/openapi-responses";
import { getOrganizationResponse } from "../utils/organizations";
import { buildCronExpression, createQstashSchedule } from "../utils/qstash";
import {
  ORGANIZATION_SCHEDULE_PATH_REGEX,
  ORGANIZATION_SCHEDULES_PATH_REGEX,
} from "../utils/regex";
import { deleteQstashScheduleWithRetry } from "../utils/triggers";

export const schedulesRoutes = createOpenApiApp();

type DbClient = ReturnType<typeof createDb>;
type CreateScheduleBody = z.infer<typeof createScheduleRequestSchema>;

const DEFAULT_SCHEDULE_NAME = "Untitled Schedule";

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

function normalizeSchedule(input: CreateScheduleBody) {
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

function hashSchedule(input: CreateScheduleBody) {
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

async function ensureScheduleTargetsExist(
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

function serializeSchedule(trigger: ScheduleTriggerWithLookbackWindow) {
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

function safeSerializeSchedule(
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

function mapQstashError(error: unknown) {
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

function filterByRepositoryIds<T extends ScheduleTriggerRow>(
  triggers: T[],
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

schedulesRoutes.get("/:organizationId/schedules", async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const pathOrg = c.req.param("organizationId");
  if (orgId !== pathOrg) {
    return c.json({ error: "Forbidden: organization access denied" }, 403);
  }

  const url = new URL(c.req.url);
  const canonicalPath = url.pathname.replace(
    ORGANIZATION_SCHEDULES_PATH_REGEX,
    "/schedules"
  );
  return c.redirect(`${canonicalPath}${url.search}`, 308);
});

schedulesRoutes.post("/:organizationId/schedules", async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const pathOrg = c.req.param("organizationId");
  if (orgId !== pathOrg) {
    return c.json({ error: "Forbidden: organization access denied" }, 403);
  }

  const url = new URL(c.req.url);
  const canonicalPath = url.pathname.replace(
    ORGANIZATION_SCHEDULES_PATH_REGEX,
    "/schedules"
  );
  return c.redirect(`${canonicalPath}${url.search}`, 308);
});

schedulesRoutes.patch("/:organizationId/schedules/:scheduleId", async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const pathOrg = c.req.param("organizationId");
  if (orgId !== pathOrg) {
    return c.json({ error: "Forbidden: organization access denied" }, 403);
  }

  const scheduleId = c.req.param("scheduleId");
  const url = new URL(c.req.url);
  const canonicalPath = url.pathname.replace(
    ORGANIZATION_SCHEDULE_PATH_REGEX,
    `/schedules/${scheduleId}`
  );
  return c.redirect(`${canonicalPath}${url.search}`, 308);
});

schedulesRoutes.delete("/:organizationId/schedules/:scheduleId", async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const pathOrg = c.req.param("organizationId");
  if (orgId !== pathOrg) {
    return c.json({ error: "Forbidden: organization access denied" }, 403);
  }

  const scheduleId = c.req.param("scheduleId");
  const url = new URL(c.req.url);
  const canonicalPath = url.pathname.replace(
    ORGANIZATION_SCHEDULE_PATH_REGEX,
    `/schedules/${scheduleId}`
  );
  return c.redirect(`${canonicalPath}${url.search}`, 308);
});

const getSchedulesRoute = createRoute({
  method: "get",
  path: "/schedules",
  tags: ["Schedules"],
  operationId: "listSchedules",
  summary: "List schedules",
  description:
    "Returns the organization's cron schedules, newest first. repositoryMap maps each targeted GitHub integration ID to an owner/repo label.",
  request: {
    query: getSchedulesQuerySchema,
  },
  responses: {
    200: {
      description: "Schedules fetched successfully",
      content: {
        "application/json": {
          schema: getSchedulesResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid query params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Organization not found"),
    500: errorResponse("Failed to list schedules"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const createScheduleRoute = createRoute({
  method: "post",
  path: "/schedules",
  tags: ["Schedules"],
  operationId: "createSchedule",
  summary: "Create a schedule",
  description:
    "Creates a recurring schedule that generates one content type from the selected GitHub integrations. Times are in UTC. A schedule with the same source, targets, output, and lookback settings as an existing one is rejected with 409.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createScheduleRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Schedule created successfully",
      content: {
        "application/json": {
          schema: scheduleResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid request"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Organization not found"),
    409: errorResponse("Duplicate schedule"),
    500: errorResponse("Failed to create schedule"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const patchScheduleRoute = createRoute({
  method: "patch",
  path: "/schedules/{scheduleId}",
  tags: ["Schedules"],
  operationId: "updateSchedule",
  summary: "Update a schedule",
  description:
    "Replaces the schedule. Send the full schedule body; fields that are omitted are not preserved from the existing schedule.",
  request: {
    params: scheduleParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: patchScheduleRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Schedule updated successfully",
      content: {
        "application/json": {
          schema: scheduleResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid request"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Schedule or organization not found"),
    409: errorResponse("Duplicate schedule"),
    500: errorResponse("Failed to update schedule"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const deleteScheduleRoute = createRoute({
  method: "delete",
  path: "/schedules/{scheduleId}",
  tags: ["Schedules"],
  operationId: "deleteSchedule",
  summary: "Delete a schedule",
  description:
    "Deletes the schedule and stops future runs. Posts generated by earlier runs are kept.",
  request: {
    params: scheduleParamsSchema,
  },
  responses: {
    200: {
      description: "Schedule deleted successfully",
      content: {
        "application/json": {
          schema: deleteScheduleResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Schedule or organization not found"),
    503: errorResponse("Authentication service unavailable"),
  },
});

schedulesRoutes.openapi(getSchedulesRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const db = c.get("db") as DbClient;
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const { repositoryIds } = c.req.valid("query");
  const triggers = await db.query.contentTriggers.findMany({
    where: and(
      eq(contentTriggers.organizationId, orgId),
      eq(contentTriggers.sourceType, "cron")
    ),
    orderBy: [desc(contentTriggers.createdAt)],
  });

  const triggerIds = triggers.map((trigger) => trigger.id);
  const lookbackWindows =
    triggerIds.length > 0
      ? await db.query.contentTriggerLookbackWindows.findMany({
          where: inArray(contentTriggerLookbackWindows.triggerId, triggerIds),
        })
      : [];

  const lookbackWindowByTriggerId = new Map(
    lookbackWindows.map((item) => [item.triggerId, item.window])
  );
  const filteredTriggers = filterByRepositoryIds(triggers, repositoryIds);

  const schedules = filteredTriggers
    .map((trigger) =>
      safeSerializeSchedule({
        ...trigger,
        lookbackWindow:
          lookbackWindowByTriggerId.get(trigger.id) ?? "last_7_days",
      })
    )
    .filter((schedule) => schedule !== null);

  const allRepositoryIds = [
    ...new Set(schedules.flatMap((schedule) => schedule.targets.repositoryIds)),
  ];
  const repositories =
    allRepositoryIds.length > 0
      ? await db
          .select({
            id: githubIntegrations.id,
            owner: githubIntegrations.owner,
            repo: githubIntegrations.repo,
            defaultBranch: githubIntegrations.defaultBranch,
          })
          .from(githubIntegrations)
          .where(inArray(githubIntegrations.id, allRepositoryIds))
      : [];

  const repositoryMap = Object.fromEntries(
    repositories
      .filter((repository) => repository.owner && repository.repo)
      .map((repository) => [
        repository.id,
        repository.defaultBranch?.trim()
          ? `${repository.owner}/${repository.repo} · ${repository.defaultBranch.trim()}`
          : `${repository.owner}/${repository.repo}`,
      ])
  );

  return c.json({ schedules, repositoryMap, organization }, 200);
});

schedulesRoutes.openapi(createScheduleRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const db = c.get("db") as DbClient;
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const input = c.req.valid("json");
  const env = (c.env ?? {}) as {
    QSTASH_TOKEN?: string;
    WORKFLOW_BASE_URL?: string;
  };
  const normalized = normalizeSchedule(input);
  const dedupeHash = hashSchedule(input);
  const existing = await db.query.contentTriggers.findFirst({
    where: and(
      eq(contentTriggers.organizationId, orgId),
      eq(contentTriggers.dedupeHash, dedupeHash)
    ),
  });

  if (existing) {
    return c.json({ error: "Duplicate schedule" }, 409);
  }

  if (input.enabled) {
    const missingTargets = await ensureScheduleTargetsExist(
      db,
      orgId,
      normalized.targets.repositoryIds,
      "Cannot create enabled schedule: one or more integrations not found"
    );

    if (missingTargets) {
      return c.json({ error: missingTargets.error }, 400);
    }
  }

  const triggerId = crypto.randomUUID();
  const persistedName = input.name.trim() || DEFAULT_SCHEDULE_NAME;
  const cronExpression = buildCronExpression(normalized.sourceConfig.cron);
  let qstashScheduleId: string | null = null;

  if (input.enabled) {
    try {
      qstashScheduleId = await createQstashSchedule(env, {
        triggerId,
        cron: cronExpression,
      });
    } catch (error) {
      const mapped = mapQstashError(error);
      if (mapped.status === 400) {
        return c.json({ error: mapped.error }, 400);
      }

      return c.json({ error: mapped.error }, 500);
    }
  }

  try {
    const schedule = await db.transaction(async (tx) => {
      const [createdTrigger] = await tx
        .insert(contentTriggers)
        .values({
          id: triggerId,
          organizationId: orgId,
          name: persistedName,
          sourceType: "cron",
          sourceConfig: normalized.sourceConfig,
          targets: normalized.targets,
          outputType: input.outputType,
          outputConfig: input.outputConfig ?? null,
          dedupeHash,
          enabled: input.enabled,
          autoPublish: input.autoPublish,
          qstashScheduleId,
        })
        .returning();

      if (!createdTrigger) {
        throw new Error("Failed to create schedule");
      }

      await tx.insert(contentTriggerLookbackWindows).values({
        triggerId,
        window: input.lookbackWindow,
      });

      return serializeSchedule({
        ...createdTrigger,
        lookbackWindow: input.lookbackWindow,
      });
    });

    return c.json({ schedule, organization }, 201);
  } catch (error) {
    if (qstashScheduleId) {
      try {
        await deleteQstashScheduleWithRetry(env, qstashScheduleId);
      } catch (cleanupError) {
        logError(
          `Failed to clean up replacement QStash schedule ${qstashScheduleId} for new schedule ${triggerId}`,
          cleanupError
        );
      }
    }

    logError("Failed to create schedule", error);
    return c.json({ error: "Failed to create schedule" }, 500);
  }
});

schedulesRoutes.openapi(patchScheduleRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const db = c.get("db") as DbClient;
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const { scheduleId } = c.req.valid("param");
  const input = c.req.valid("json");
  const env = (c.env ?? {}) as {
    QSTASH_TOKEN?: string;
    WORKFLOW_BASE_URL?: string;
  };
  const normalized = normalizeSchedule(input);
  const dedupeHash = hashSchedule(input);
  const duplicate = await db.query.contentTriggers.findFirst({
    where: and(
      eq(contentTriggers.organizationId, orgId),
      eq(contentTriggers.dedupeHash, dedupeHash),
      ne(contentTriggers.id, scheduleId)
    ),
  });

  if (duplicate) {
    return c.json({ error: "Duplicate schedule" }, 409);
  }

  if (input.enabled) {
    const missingTargets = await ensureScheduleTargetsExist(
      db,
      orgId,
      normalized.targets.repositoryIds,
      "Cannot enable schedule: one or more integrations have been deleted"
    );

    if (missingTargets) {
      return c.json({ error: missingTargets.error }, 400);
    }
  }

  const affectedQstashIds = new Set<string>();
  let committed = false;
  try {
    const response = await db.transaction(async (tx) => {
      // Lock before reading or changing remote state. Concurrent PATCHes must
      // observe the preceding request's committed configuration.
      const [existing] = await tx
        .select()
        .from(contentTriggers)
        .where(
          and(
            eq(contentTriggers.id, scheduleId),
            eq(contentTriggers.organizationId, orgId),
            eq(contentTriggers.sourceType, "cron")
          )
        )
        .for("update");

      if (!existing) {
        return c.json({ error: "Schedule not found" }, 404);
      }

      let qstashScheduleId: string | null = null;
      if (input.enabled) {
        // Choose the ID before sending so even a lost response is recoverable.
        qstashScheduleId = existing.qstashScheduleId ?? crypto.randomUUID();
        affectedQstashIds.add(qstashScheduleId);
        const returnedId = await createQstashSchedule(env, {
          triggerId: scheduleId,
          cron: buildCronExpression(normalized.sourceConfig.cron),
          scheduleId: qstashScheduleId,
        });
        affectedQstashIds.add(returnedId);
        if (returnedId !== qstashScheduleId) {
          throw new Error("QStash returned an unexpected schedule ID");
        }
      } else if (existing.qstashScheduleId) {
        affectedQstashIds.add(existing.qstashScheduleId);
        await deleteQstashScheduleWithRetry(env, existing.qstashScheduleId);
      }

      const [updatedTrigger] = await tx
        .update(contentTriggers)
        .set({
          name: input.name.trim() || existing.name || DEFAULT_SCHEDULE_NAME,
          sourceType: "cron",
          sourceConfig: normalized.sourceConfig,
          targets: normalized.targets,
          outputType: input.outputType,
          outputConfig: input.outputConfig ?? null,
          dedupeHash,
          enabled: input.enabled,
          autoPublish: input.autoPublish,
          qstashScheduleId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contentTriggers.id, scheduleId),
            eq(contentTriggers.organizationId, orgId)
          )
        )
        .returning();

      if (!updatedTrigger) {
        throw new Error("Failed to update schedule");
      }

      await tx
        .insert(contentTriggerLookbackWindows)
        .values({
          triggerId: scheduleId,
          window: input.lookbackWindow,
        })
        .onConflictDoUpdate({
          target: contentTriggerLookbackWindows.triggerId,
          set: {
            window: input.lookbackWindow,
            updatedAt: new Date(),
          },
        });

      const schedule = serializeSchedule({
        ...updatedTrigger,
        lookbackWindow: input.lookbackWindow,
      });
      return c.json({ schedule, organization }, 200);
    });
    committed = true;
    return response;
  } catch (error) {
    if (!committed && affectedQstashIds.size > 0) {
      try {
        await db.transaction(async (tx) => {
          // The failed transaction released its lock. Re-read under a new lock:
          // another request may have committed while recovery was waiting.
          const [current] = await tx
            .select()
            .from(contentTriggers)
            .where(
              and(
                eq(contentTriggers.id, scheduleId),
                eq(contentTriggers.organizationId, orgId),
                eq(contentTriggers.sourceType, "cron")
              )
            )
            .for("update");
          const currentQstashId = current?.enabled
            ? current.qstashScheduleId
            : null;

          if (currentQstashId && current) {
            const config = scheduleSourceConfigSchema.parse(
              current.sourceConfig
            );
            const restoredId = await createQstashSchedule(env, {
              triggerId: scheduleId,
              cron: buildCronExpression(config.cron),
              scheduleId: currentQstashId,
            });
            if (restoredId !== currentQstashId) {
              await deleteQstashScheduleWithRetry(env, restoredId);
              throw new Error("QStash returned an unexpected restoration ID");
            }
          }

          for (const affectedId of affectedQstashIds) {
            if (affectedId !== currentQstashId) {
              await deleteQstashScheduleWithRetry(env, affectedId);
            }
          }
        });
      } catch (recoveryError) {
        logError(
          `Failed to reconcile QStash schedules ${[...affectedQstashIds].join(", ")} for schedule ${scheduleId}; retry PATCH to heal`,
          recoveryError
        );
      }
    }

    logError("Failed to update schedule", error);
    const mapped = mapQstashError(error);
    if (mapped.status === 400) {
      return c.json({ error: mapped.error }, 400);
    }
    return c.json({ error: "Failed to update schedule" }, 500);
  }
});

schedulesRoutes.openapi(deleteScheduleRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const db = c.get("db") as DbClient;
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const { scheduleId } = c.req.valid("param");
  const env = (c.env ?? {}) as {
    QSTASH_TOKEN?: string;
    WORKFLOW_BASE_URL?: string;
  };
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(contentTriggers)
      .where(
        and(
          eq(contentTriggers.id, scheduleId),
          eq(contentTriggers.organizationId, orgId),
          eq(contentTriggers.sourceType, "cron")
        )
      )
      .for("update");

    if (!existing) {
      return c.json({ error: "Schedule not found" }, 404);
    }

    if (existing.qstashScheduleId) {
      await deleteQstashScheduleWithRetry(env, existing.qstashScheduleId);
    }

    await tx
      .delete(contentTriggers)
      .where(
        and(
          eq(contentTriggers.id, scheduleId),
          eq(contentTriggers.organizationId, orgId)
        )
      );

    return c.json({ id: scheduleId, organization }, 200);
  });
});
