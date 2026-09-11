import { createRoute } from "@hono/zod-openapi";
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

import { API_FEEDBACK_VIA } from "../constants/analytics";
import {
  FEEDBACK_NOT_FOUND_ERROR,
  FEEDBACK_ORGANIZATION_NOT_FOUND_ERROR,
  FEEDBACK_PROJECT_NOT_FOUND_ERROR,
} from "../constants/feedback";
import { ORGANIZATION_SCOPED_API_KEY_ERROR } from "../constants/skills";
import {
  getFeedback as getFeedbackProgram,
  listFeedback as listFeedbackProgram,
  submitFeedback as submitFeedbackProgram,
  updateFeedback as updateFeedbackProgram,
} from "../programs/feedback";
import { trackFeedbackReceived } from "../utils/analytics";
import { getOrganizationId } from "../utils/auth";
import {
  findOrganizationIdBySlug,
  getIngestProjectId,
  runFeedbackProgram,
  serializeFeedback,
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

  const result = await runFeedbackProgram(
    submitFeedbackProgram({
      db: c.get("db"),
      organizationId,
      body: c.req.valid("json"),
      ingestProjectId: getIngestProjectId(c),
      userAgent: c.req.header("user-agent") ?? null,
    })
  );
  if (result._tag === "Failure") {
    if (result.failure._tag === "FeedbackProjectNotFoundError") {
      return c.json({ error: FEEDBACK_PROJECT_NOT_FOUND_ERROR }, 404);
    }
    if (result.failure._tag === "FeedbackNotFoundError") {
      return c.json({ error: FEEDBACK_NOT_FOUND_ERROR }, 404);
    }
    throw result.failure;
  }

  const feedback = serializeFeedback(result.success.feedback);

  trackFeedbackReceived(c, {
    organizationId,
    feedback,
    deduplicated: result.success.deduplicated,
    via: API_FEEDBACK_VIA.PUBLIC_SLUG,
  });

  return c.json({ feedback, deduplicated: result.success.deduplicated }, 202);
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

  const result = await runFeedbackProgram(
    submitFeedbackProgram({
      db: c.get("db"),
      organizationId,
      body: c.req.valid("json"),
      ingestProjectId: getIngestProjectId(c),
      userAgent: c.req.header("user-agent") ?? null,
    })
  );
  if (result._tag === "Failure") {
    if (result.failure._tag === "FeedbackProjectNotFoundError") {
      return c.json({ error: FEEDBACK_PROJECT_NOT_FOUND_ERROR }, 404);
    }
    if (result.failure._tag === "FeedbackNotFoundError") {
      return c.json({ error: FEEDBACK_NOT_FOUND_ERROR }, 404);
    }
    throw result.failure;
  }

  const feedback = serializeFeedback(result.success.feedback);

  trackFeedbackReceived(c, {
    organizationId,
    feedback,
    deduplicated: result.success.deduplicated,
    via: API_FEEDBACK_VIA.TOKEN,
  });

  return c.json({ feedback, deduplicated: result.success.deduplicated }, 202);
});

feedbackRoutes.openapi(listFeedbackRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const result = await runFeedbackProgram(
    listFeedbackProgram({
      db: c.get("db"),
      organizationId,
      query: c.req.valid("query"),
    })
  );
  if (result._tag === "Failure") {
    throw result.failure;
  }

  const { feedback, pagination } = result.success;

  return c.json(
    {
      feedback: feedback.map(serializeFeedback),
      pagination,
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
  const result = await runFeedbackProgram(
    getFeedbackProgram({
      db: c.get("db"),
      organizationId,
      feedbackId,
    })
  );
  if (result._tag === "Failure") {
    if (result.failure._tag === "FeedbackNotFoundError") {
      return c.json({ error: FEEDBACK_NOT_FOUND_ERROR }, 404);
    }
    throw result.failure;
  }

  return c.json({ feedback: serializeFeedback(result.success) }, 200);
});

feedbackRoutes.openapi(updateFeedbackRoute, async (c) => {
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json({ error: ORGANIZATION_SCOPED_API_KEY_ERROR }, 403);
  }

  const { feedbackId } = c.req.valid("param");
  const result = await runFeedbackProgram(
    updateFeedbackProgram({
      db: c.get("db"),
      organizationId,
      feedbackId,
      body: c.req.valid("json"),
    })
  );
  if (result._tag === "Failure") {
    if (result.failure._tag === "FeedbackNotFoundError") {
      return c.json({ error: FEEDBACK_NOT_FOUND_ERROR }, 404);
    }
    throw result.failure;
  }

  return c.json({ feedback: serializeFeedback(result.success) }, 200);
});
