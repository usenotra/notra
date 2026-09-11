import crypto from "node:crypto";

import { createRoute } from "@hono/zod-openapi";
import {
  hashTrigger,
  normalizeTriggerConfig,
} from "@notra/ai/utils/trigger-hash";
import { contentTriggers, githubIntegrations } from "@notra/db/schema";
import {
  createEventTriggerRequestSchema,
  deleteEventTriggerResponseSchema,
  eventTriggerParamsSchema,
  eventTriggerResponseSchema,
  getEventTriggersQuerySchema,
  getEventTriggersResponseSchema,
  patchEventTriggerRequestSchema,
} from "@notra/schemas/api/event-triggers";
import { and, desc, eq, inArray, ne } from "drizzle-orm";

import type { DbClient } from "../types/db";
import { getOrganizationId } from "../utils/auth";
import {
  ensureEventTriggerTargetsExist,
  filterEventTriggersByRepositoryIds,
  safeSerializeEventTrigger,
  serializeEventTrigger,
} from "../utils/event-triggers";
import { logError } from "../utils/logging";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse } from "../utils/openapi-responses";
import { getOrganizationResponse } from "../utils/organizations";
import { isPgUniqueViolation } from "../utils/pg-errors";
import {
  ORGANIZATION_EVENT_TRIGGER_PATH_REGEX,
  ORGANIZATION_EVENT_TRIGGERS_PATH_REGEX,
} from "../utils/regex";

export const eventTriggersRoutes = createOpenApiApp();

eventTriggersRoutes.on(
  ["GET", "POST"],
  "/:organizationId/event-triggers",
  (c) => {
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
      ORGANIZATION_EVENT_TRIGGERS_PATH_REGEX,
      "/event-triggers"
    );
    return c.redirect(`${canonicalPath}${url.search}`, 308);
  }
);

eventTriggersRoutes.on(
  ["GET", "PATCH", "DELETE"],
  "/:organizationId/event-triggers/:triggerId",
  (c) => {
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

    const triggerId = c.req.param("triggerId");
    const url = new URL(c.req.url);
    const canonicalPath = url.pathname.replace(
      ORGANIZATION_EVENT_TRIGGER_PATH_REGEX,
      `/event-triggers/${triggerId}`
    );
    return c.redirect(`${canonicalPath}${url.search}`, 308);
  }
);

const getEventTriggersRoute = createRoute({
  method: "get",
  path: "/event-triggers",
  tags: ["Event Triggers"],
  operationId: "listEventTriggers",
  summary: "List event triggers",
  request: {
    query: getEventTriggersQuerySchema,
  },
  responses: {
    200: {
      description: "Event triggers fetched successfully",
      content: {
        "application/json": {
          schema: getEventTriggersResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid query params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Organization not found"),
    500: errorResponse("Failed to list event triggers"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const createEventTriggerRoute = createRoute({
  method: "post",
  path: "/event-triggers",
  tags: ["Event Triggers"],
  operationId: "createEventTrigger",
  summary: "Create an event trigger",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createEventTriggerRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Event trigger created successfully",
      content: {
        "application/json": {
          schema: eventTriggerResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid request"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Organization not found"),
    409: errorResponse("Duplicate event trigger"),
    500: errorResponse("Failed to create event trigger"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const getEventTriggerRoute = createRoute({
  method: "get",
  path: "/event-triggers/{triggerId}",
  tags: ["Event Triggers"],
  operationId: "getEventTrigger",
  summary: "Get an event trigger",
  request: {
    params: eventTriggerParamsSchema,
  },
  responses: {
    200: {
      description: "Event trigger fetched successfully",
      content: {
        "application/json": {
          schema: eventTriggerResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Event trigger or organization not found"),
    500: errorResponse("Failed to fetch event trigger"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const patchEventTriggerRoute = createRoute({
  method: "patch",
  path: "/event-triggers/{triggerId}",
  tags: ["Event Triggers"],
  operationId: "updateEventTrigger",
  summary: "Update an event trigger",
  request: {
    params: eventTriggerParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: patchEventTriggerRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Event trigger updated successfully",
      content: {
        "application/json": {
          schema: eventTriggerResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid request"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Event trigger or organization not found"),
    409: errorResponse("Duplicate event trigger"),
    500: errorResponse("Failed to update event trigger"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const deleteEventTriggerRoute = createRoute({
  method: "delete",
  path: "/event-triggers/{triggerId}",
  tags: ["Event Triggers"],
  operationId: "deleteEventTrigger",
  summary: "Delete an event trigger",
  request: {
    params: eventTriggerParamsSchema,
  },
  responses: {
    200: {
      description: "Event trigger deleted successfully",
      content: {
        "application/json": {
          schema: deleteEventTriggerResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Event trigger or organization not found"),
    503: errorResponse("Authentication service unavailable"),
  },
});

eventTriggersRoutes.openapi(getEventTriggersRoute, async (c) => {
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
      eq(contentTriggers.sourceType, "github_webhook")
    ),
    orderBy: [desc(contentTriggers.createdAt)],
  });

  const filteredTriggers = filterEventTriggersByRepositoryIds(
    triggers,
    repositoryIds
  );

  const eventTriggers = filteredTriggers
    .map((trigger) => safeSerializeEventTrigger(trigger))
    .filter((trigger) => trigger !== null);

  const allRepositoryIds = [
    ...new Set(
      eventTriggers.flatMap((trigger) => trigger.targets.repositoryIds)
    ),
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

  return c.json({ eventTriggers, repositoryMap, organization }, 200);
});

eventTriggersRoutes.openapi(createEventTriggerRoute, async (c) => {
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
  const normalized = normalizeTriggerConfig({
    sourceConfig: input.sourceConfig,
    targets: input.targets,
  });
  const dedupeHash = hashTrigger({
    sourceType: input.sourceType,
    sourceConfig: input.sourceConfig,
    targets: input.targets,
    outputType: input.outputType,
  });

  const existing = await db.query.contentTriggers.findFirst({
    where: and(
      eq(contentTriggers.organizationId, orgId),
      eq(contentTriggers.dedupeHash, dedupeHash)
    ),
  });

  if (existing) {
    return c.json({ error: "Duplicate event trigger" }, 409);
  }

  const missingTargets = await ensureEventTriggerTargetsExist(
    db,
    orgId,
    normalized.targets.repositoryIds,
    "Cannot create event trigger: one or more integrations not found"
  );

  if (missingTargets) {
    return c.json({ error: missingTargets.error }, 400);
  }

  try {
    const [createdTrigger] = await db
      .insert(contentTriggers)
      .values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        sourceType: input.sourceType,
        sourceConfig: normalized.sourceConfig,
        targets: normalized.targets,
        outputType: input.outputType,
        outputConfig: input.outputConfig ?? null,
        dedupeHash,
        enabled: input.enabled,
        autoPublish: input.autoPublish,
      })
      .returning();

    if (!createdTrigger) {
      throw new Error("Failed to create event trigger");
    }

    return c.json(
      { eventTrigger: serializeEventTrigger(createdTrigger), organization },
      201
    );
  } catch (error) {
    if (isPgUniqueViolation(error)) {
      return c.json({ error: "Duplicate event trigger" }, 409);
    }

    logError("Failed to create event trigger", error);
    return c.json({ error: "Failed to create event trigger" }, 500);
  }
});

eventTriggersRoutes.openapi(getEventTriggerRoute, async (c) => {
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

  const { triggerId } = c.req.valid("param");
  const existing = await db.query.contentTriggers.findFirst({
    where: and(
      eq(contentTriggers.id, triggerId),
      eq(contentTriggers.organizationId, orgId),
      eq(contentTriggers.sourceType, "github_webhook")
    ),
  });

  if (!existing) {
    return c.json({ error: "Event trigger not found" }, 404);
  }

  const eventTrigger = safeSerializeEventTrigger(existing);

  if (!eventTrigger) {
    return c.json({ error: "Failed to fetch event trigger" }, 500);
  }

  return c.json({ eventTrigger, organization }, 200);
});

eventTriggersRoutes.openapi(patchEventTriggerRoute, async (c) => {
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

  const { triggerId } = c.req.valid("param");
  const input = c.req.valid("json");
  const normalized = normalizeTriggerConfig({
    sourceConfig: input.sourceConfig,
    targets: input.targets,
  });
  const dedupeHash = hashTrigger({
    sourceType: input.sourceType,
    sourceConfig: input.sourceConfig,
    targets: input.targets,
    outputType: input.outputType,
  });

  const existing = await db.query.contentTriggers.findFirst({
    where: and(
      eq(contentTriggers.id, triggerId),
      eq(contentTriggers.organizationId, orgId),
      eq(contentTriggers.sourceType, "github_webhook")
    ),
  });

  if (!existing) {
    return c.json({ error: "Event trigger not found" }, 404);
  }

  const duplicate = await db.query.contentTriggers.findFirst({
    where: and(
      eq(contentTriggers.organizationId, orgId),
      eq(contentTriggers.dedupeHash, dedupeHash),
      ne(contentTriggers.id, triggerId)
    ),
  });

  if (duplicate) {
    return c.json({ error: "Duplicate event trigger" }, 409);
  }

  const missingTargets = await ensureEventTriggerTargetsExist(
    db,
    orgId,
    normalized.targets.repositoryIds,
    "Cannot update event trigger: one or more integrations not found"
  );

  if (missingTargets) {
    return c.json({ error: missingTargets.error }, 400);
  }

  try {
    const [updatedTrigger] = await db
      .update(contentTriggers)
      .set({
        sourceType: input.sourceType,
        sourceConfig: normalized.sourceConfig,
        targets: normalized.targets,
        outputType: input.outputType,
        outputConfig: input.outputConfig ?? null,
        dedupeHash,
        enabled: input.enabled,
        autoPublish: input.autoPublish,
        qstashScheduleId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contentTriggers.id, triggerId),
          eq(contentTriggers.organizationId, orgId)
        )
      )
      .returning();

    if (!updatedTrigger) {
      throw new Error("Failed to update event trigger");
    }

    return c.json(
      { eventTrigger: serializeEventTrigger(updatedTrigger), organization },
      200
    );
  } catch (error) {
    if (isPgUniqueViolation(error)) {
      return c.json({ error: "Duplicate event trigger" }, 409);
    }

    logError("Failed to update event trigger", error);
    return c.json({ error: "Failed to update event trigger" }, 500);
  }
});

eventTriggersRoutes.openapi(deleteEventTriggerRoute, async (c) => {
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

  const { triggerId } = c.req.valid("param");
  const existing = await db.query.contentTriggers.findFirst({
    where: and(
      eq(contentTriggers.id, triggerId),
      eq(contentTriggers.organizationId, orgId),
      eq(contentTriggers.sourceType, "github_webhook")
    ),
  });

  if (!existing) {
    return c.json({ error: "Event trigger not found" }, 404);
  }

  await db
    .delete(contentTriggers)
    .where(
      and(
        eq(contentTriggers.id, triggerId),
        eq(contentTriggers.organizationId, orgId)
      )
    );

  return c.json({ id: triggerId, organization }, 200);
});
