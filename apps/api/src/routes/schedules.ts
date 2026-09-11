import { createRoute } from "@hono/zod-openapi";
import type { createDb } from "@notra/db/drizzle";
import {
  createScheduleRequestSchema,
  deleteScheduleResponseSchema,
  getSchedulesQuerySchema,
  getSchedulesResponseSchema,
  patchScheduleRequestSchema,
  scheduleParamsSchema,
  scheduleResponseSchema,
} from "@notra/schemas/api/schedules";

import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  patchSchedule,
} from "../programs/schedules";
import { getOrganizationId } from "../utils/auth";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse } from "../utils/openapi-responses";
import { getOrganizationResponse } from "../utils/organizations";
import {
  ORGANIZATION_SCHEDULE_PATH_REGEX,
  ORGANIZATION_SCHEDULES_PATH_REGEX,
} from "../utils/regex";
import { runScheduleProgram } from "../utils/schedules";

export const schedulesRoutes = createOpenApiApp();

type DbClient = ReturnType<typeof createDb>;

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
    500: errorResponse("Failed to delete schedule"),
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
  const result = await runScheduleProgram(
    listSchedules({ db, organizationId: orgId, repositoryIds })
  );

  if (result._tag === "Failure") {
    throw result.failure;
  }

  return c.json({ ...result.success, organization }, 200);
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

  const body = c.req.valid("json");
  const env = (c.env ?? {}) as {
    QSTASH_TOKEN?: string;
    WORKFLOW_BASE_URL?: string;
  };
  const result = await runScheduleProgram(
    createSchedule({ db, organizationId: orgId, body, env })
  );

  if (result._tag === "Failure") {
    const failure = result.failure;
    if (failure._tag === "ScheduleDuplicateError") {
      return c.json({ error: "Duplicate schedule" }, 409);
    }
    if (failure._tag === "ScheduleMissingTargetsError") {
      return c.json({ error: failure.message }, 400);
    }
    if (failure._tag === "ScheduleQstashError") {
      return c.json({ error: failure.message }, failure.status);
    }
    throw failure;
  }

  return c.json({ schedule: result.success, organization }, 201);
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
  const body = c.req.valid("json");
  const env = (c.env ?? {}) as {
    QSTASH_TOKEN?: string;
    WORKFLOW_BASE_URL?: string;
  };

  const result = await runScheduleProgram(
    patchSchedule({
      db,
      organizationId: orgId,
      scheduleId,
      body,
      env,
    })
  );

  if (result._tag === "Failure") {
    const failure = result.failure;
    if (failure._tag === "ScheduleNotFoundError") {
      return c.json({ error: "Schedule not found" }, 404);
    }
    if (failure._tag === "ScheduleDuplicateError") {
      return c.json({ error: "Duplicate schedule" }, 409);
    }
    if (failure._tag === "ScheduleMissingTargetsError") {
      return c.json({ error: failure.message }, 400);
    }
    if (failure._tag === "ScheduleQstashError") {
      return c.json({ error: failure.message }, failure.status);
    }
    throw failure;
  }

  return c.json({ schedule: result.success, organization }, 200);
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
  const result = await runScheduleProgram(
    deleteSchedule({ db, organizationId: orgId, scheduleId, env })
  );

  if (result._tag === "Failure") {
    const failure = result.failure;
    if (failure._tag === "ScheduleNotFoundError") {
      return c.json({ error: "Schedule not found" }, 404);
    }
    throw failure;
  }

  return c.json({ id: result.success, organization }, 200);
});
