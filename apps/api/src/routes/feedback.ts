import { createRoute } from "@hono/zod-openapi";
import { agentFeedback } from "@notra/db/schema";
import {
  feedbackOrganizationParamsSchema,
  feedbackParamsSchema,
  feedbackResponseSchema,
  listFeedbackQuerySchema,
  listFeedbackResponseSchema,
  submitFeedbackRequestSchema,
  submitFeedbackResponseSchema,
  updateFeedbackRequestSchema,
} from "@notra/schemas/api/feedback";
import { and, count, desc, eq } from "drizzle-orm";

import { API_FEEDBACK_VIA } from "../constants/analytics";
import {
  FEEDBACK_NOT_FOUND_ERROR,
  FEEDBACK_ORGANIZATION_NOT_FOUND_ERROR,
  FEEDBACK_PROJECT_NOT_FOUND_ERROR,
} from "../constants/feedback";
import { ORGANIZATION_SCOPED_API_KEY_ERROR } from "../constants/skills";
import { trackFeedbackReceived } from "../utils/analytics";
import { getOrganizationId } from "../utils/auth";
import {
  findOrganizationIdBySlug,
  serializeFeedback,
  submitFeedback,
} from "../utils/feedback";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse, rateLimitResponse } from "../utils/openapi-responses";
import {
  enforceRatelimit,
  enforceRatelimitForKey,
  RATE_LIMITS,
  ratelimit,
} from "../utils/ratelimit";

export const feedbackRoutes = createOpenApiApp();

const feedbackAcceptedResponse = {
  description: "Feedback accepted",
  content: {
    "application/json": { schema: submitFeedbackResponseSchema },
  },
};

const feedbackRateLimitedResponse = rateLimitResponse(
  RATE_LIMITS.feedbackIngest.requests,
  RATE_LIMITS.feedbackIngest.window,
  "API key"
);

const publicFeedbackRateLimitedResponse = rateLimitResponse(
  RATE_LIMITS.feedbackIngestIp.requests,
  RATE_LIMITS.feedbackIngestIp.window,
  `IP address, plus ${RATE_LIMITS.feedbackIngestOrganization.requests} requests per ${RATE_LIMITS.feedbackIngestOrganization.window} per organization`
);

const submitFeedbackBody = {
  required: true,
  content: {
    "application/json": { schema: submitFeedbackRequestSchema },
  },
};

const submitOrganizationFeedbackRoute = createRoute({
  method: "post",
  path: "/feedback/{organizationSlug}",
  tags: ["Feedback"],
  operationId: "submitOrganizationFeedback",
  summary: "Submit feedback to an organization's feedback URL",
  description:
    "Record feedback from an AI agent or integration by posting to the organization's feedback URL, as shown on the Feedback page in the dashboard. No credentials are required. Limited per source IP and per organization.",
  security: [],
  request: {
    params: feedbackOrganizationParamsSchema,
    body: submitFeedbackBody,
  },
  responses: {
    202: feedbackAcceptedResponse,
    400: errorResponse("Invalid request body"),
    404: errorResponse(FEEDBACK_ORGANIZATION_NOT_FOUND_ERROR),
    429: publicFeedbackRateLimitedResponse,
  },
});

const submitFeedbackRoute = createRoute({
  method: "post",
  path: "/feedback",
  tags: ["Feedback"],
  operationId: "submitFeedback",
  summary: "Submit feedback with an API key",
  description:
    "Record feedback for the organization that owns the credential. Requires an API key with the feedback.write scope. Agents and MCP servers should post to the organization's feedback URL instead.",
  request: {
    body: submitFeedbackBody,
  },
  responses: {
    202: feedbackAcceptedResponse,
    400: errorResponse("Invalid request body"),
    401: errorResponse("Missing or invalid credentials"),
    403: errorResponse("Forbidden"),
    404: errorResponse(FEEDBACK_PROJECT_NOT_FOUND_ERROR),
    429: feedbackRateLimitedResponse,
    503: errorResponse("Authentication service unavailable"),
  },
});

const listFeedbackRoute = createRoute({
  method: "get",
  path: "/feedback",
  tags: ["Feedback"],
  operationId: "listFeedback",
  summary: "List feedback",
  request: { query: listFeedbackQuerySchema },
  responses: {
    200: {
      description: "Feedback fetched successfully",
      content: { "application/json": { schema: listFeedbackResponseSchema } },
    },
    400: errorResponse("Invalid query params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const getFeedbackRoute = createRoute({
  method: "get",
  path: "/feedback/{feedbackId}",
  tags: ["Feedback"],
  operationId: "getFeedback",
  summary: "Get a single feedback entry",
  request: { params: feedbackParamsSchema },
  responses: {
    200: {
      description: "Feedback fetched successfully",
      content: { "application/json": { schema: feedbackResponseSchema } },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse(FEEDBACK_NOT_FOUND_ERROR),
    503: errorResponse("Authentication service unavailable"),
  },
});

const updateFeedbackRoute = createRoute({
  method: "patch",
  path: "/feedback/{feedbackId}",
  tags: ["Feedback"],
  operationId: "updateFeedback",
  summary: "Update feedback status",
  request: {
    params: feedbackParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": { schema: updateFeedbackRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Feedback updated successfully",
      content: { "application/json": { schema: feedbackResponseSchema } },
    },
    400: errorResponse("Invalid path params or request body"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse(FEEDBACK_NOT_FOUND_ERROR),
    503: errorResponse("Authentication service unavailable"),
  },
});

feedbackRoutes.openapi(submitOrganizationFeedbackRoute, async (c) => {
  const ipLimited = await enforceRatelimit(c, ratelimit.feedbackIngestIp, "ip");
  if (ipLimited) {
    return ipLimited;
  }

  const { organizationSlug } = c.req.valid("param");
  const organizationId = await findOrganizationIdBySlug(c, organizationSlug);
  if (!organizationId) {
    return c.json({ error: FEEDBACK_ORGANIZATION_NOT_FOUND_ERROR }, 404);
  }

  const organizationLimited = await enforceRatelimitForKey(
    c,
    ratelimit.feedbackIngestOrganization,
    organizationId
  );
  if (organizationLimited) {
    return organizationLimited;
  }

  const outcome = await submitFeedback(c, organizationId, c.req.valid("json"));
  if (outcome.kind === "project_not_found") {
    return c.json({ error: FEEDBACK_PROJECT_NOT_FOUND_ERROR }, 404);
  }
  if (outcome.kind === "not_found") {
    return c.json({ error: FEEDBACK_NOT_FOUND_ERROR }, 404);
  }

  trackFeedbackReceived(c, {
    organizationId,
    feedback: outcome.feedback,
    deduplicated: outcome.deduplicated,
    via: API_FEEDBACK_VIA.PUBLIC_SLUG,
  });

  return c.json(
    { feedback: outcome.feedback, deduplicated: outcome.deduplicated },
    202
  );
});

feedbackRoutes.openapi(submitFeedbackRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const rateLimited = await enforceRatelimit(c, ratelimit.feedbackIngest);
  if (rateLimited) {
    return rateLimited;
  }

  const outcome = await submitFeedback(c, organizationId, c.req.valid("json"));
  if (outcome.kind === "project_not_found") {
    return c.json({ error: FEEDBACK_PROJECT_NOT_FOUND_ERROR }, 404);
  }
  if (outcome.kind === "not_found") {
    return c.json({ error: FEEDBACK_NOT_FOUND_ERROR }, 404);
  }

  trackFeedbackReceived(c, {
    organizationId,
    feedback: outcome.feedback,
    deduplicated: outcome.deduplicated,
    via: API_FEEDBACK_VIA.TOKEN,
  });

  return c.json(
    { feedback: outcome.feedback, deduplicated: outcome.deduplicated },
    202
  );
});

feedbackRoutes.openapi(listFeedbackRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const query = c.req.valid("query");
  const conditions = [eq(agentFeedback.organizationId, organizationId)];
  if (query.status) {
    conditions.push(eq(agentFeedback.status, query.status));
  }
  if (query.kind) {
    conditions.push(eq(agentFeedback.kind, query.kind));
  }
  if (query.projectId) {
    conditions.push(eq(agentFeedback.projectId, query.projectId));
  }
  const where = and(...conditions);

  const db = c.get("db");
  const [[totals], rows] = await Promise.all([
    db.select({ total: count() }).from(agentFeedback).where(where),
    db
      .select()
      .from(agentFeedback)
      .where(where)
      .orderBy(desc(agentFeedback.createdAt))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit),
  ]);

  const totalItems = totals?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));

  return c.json(
    {
      feedback: rows.map(serializeFeedback),
      pagination: {
        limit: query.limit,
        currentPage: query.page,
        nextPage: query.page < totalPages ? query.page + 1 : null,
        previousPage: query.page > 1 ? query.page - 1 : null,
        totalPages,
        totalItems,
      },
    },
    200
  );
});

feedbackRoutes.openapi(getFeedbackRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const { feedbackId } = c.req.valid("param");
  const row = await c.get("db").query.agentFeedback.findFirst({
    where: and(
      eq(agentFeedback.organizationId, organizationId),
      eq(agentFeedback.id, feedbackId)
    ),
  });

  if (!row) {
    return c.json({ error: FEEDBACK_NOT_FOUND_ERROR }, 404);
  }

  return c.json({ feedback: serializeFeedback(row) }, 200);
});

feedbackRoutes.openapi(updateFeedbackRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const { feedbackId } = c.req.valid("param");
  const body = c.req.valid("json");

  const [updated] = await c
    .get("db")
    .update(agentFeedback)
    .set({
      status: body.status,
      resolvedAt: body.status === "resolved" ? new Date() : null,
    })
    .where(
      and(
        eq(agentFeedback.organizationId, organizationId),
        eq(agentFeedback.id, feedbackId)
      )
    )
    .returning();

  if (!updated) {
    return c.json({ error: FEEDBACK_NOT_FOUND_ERROR }, 404);
  }

  return c.json({ feedback: serializeFeedback(updated) }, 200);
});
