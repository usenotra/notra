import { createRoute } from "@hono/zod-openapi";
import {
  AgentSendLockedError,
  createAgentSessionWithMapping,
  forwardAgentFollowUp,
  forwardAgentStream,
  getAgentSessionMapping,
  listAgentSessionMappings,
} from "@notra/ai/utils/agent-proxy";
import {
  agentSessionParamsSchema,
  createAgentSessionRequestSchema,
  createAgentSessionResponseSchema,
  listAgentChatsQuerySchema,
  listAgentChatsResponseSchema,
  sendAgentMessageRequestSchema,
} from "@notra/schemas/api/agent-chats";
import type { Context } from "hono";

import { createAgentClient, isAgentApiEnabled } from "../lib/agent/client";
import { checkAgentAiCredits } from "../utils/agent-credits";
import { getOrganizationId } from "../utils/auth";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse, rateLimitResponse } from "../utils/openapi-responses";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";

export const agentChatsRoutes = createOpenApiApp();

const chatRateLimitResponse = rateLimitResponse(
  RATE_LIMITS.chatGeneration.requests,
  RATE_LIMITS.chatGeneration.window
);

const commonErrorResponses = {
  401: errorResponse("Missing or invalid API key"),
  403: errorResponse("Forbidden, or usage limit reached"),
  503: errorResponse("Agent service is not configured"),
};

async function requireAgentContext(
  c: Context
): Promise<
  { ok: true; organizationId: string } | { ok: false; response: Response }
> {
  if (!isAgentApiEnabled()) {
    return {
      ok: false,
      response: c.json({ error: "Agent service is not configured" }, 503),
    };
  }
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return {
      ok: false,
      response: c.json(
        { error: "Forbidden: API key must be scoped to an organization" },
        403
      ),
    };
  }
  const rateLimited = await enforceRatelimit(
    c,
    ratelimit.chatGeneration,
    "organization"
  );
  if (rateLimited) {
    return { ok: false, response: rateLimited };
  }
  return { ok: true, organizationId };
}

agentChatsRoutes.openAPIRegistry.registerPath(
  createRoute({
    method: "post",
    path: "/eve/v1/session",
    tags: ["Agent"],
    operationId: "createAgentSession",
    summary: "Start a durable agent session",
    description:
      "The exact eve session protocol the Notra dashboard uses, proxied through API auth. Point any eve client (eve/client, useEveAgent) at /v2 as its host with your API key as a bearer token. Returns the session id and continuation token; stream events from GET /v2/eve/v1/session/{sessionId}/stream.",
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: createAgentSessionRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Session created",
        content: {
          "application/json": { schema: createAgentSessionResponseSchema },
        },
      },
      400: errorResponse("Invalid request body"),
      429: chatRateLimitResponse,
      500: errorResponse("Failed to check usage limits"),
      502: errorResponse("Agent session creation failed"),
      ...commonErrorResponses,
    },
  })
);

agentChatsRoutes.post("/eve/v1/session", async (c) => {
  const context = await requireAgentContext(c);
  if (!context.ok) {
    return context.response;
  }
  const credits = await checkAgentAiCredits(context.organizationId);
  if (!credits.allowed) {
    return c.json({ error: credits.error, code: credits.code }, credits.status);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = createAgentSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  try {
    const client = await createAgentClient({
      organizationId: context.organizationId,
      useMarkup: credits.useMarkup,
      chargeAiCredits: credits.chargeAiCredits,
    });
    const created = await createAgentSessionWithMapping({
      fetchUpstream: (path, init) => client.fetch(path, init),
      scope: {
        organizationId: context.organizationId,
        surface: "standalone-chat",
      },
      message: parsed.data.message,
    });
    return c.json(
      {
        ok: true,
        sessionId: created.eveSessionId,
        continuationToken: created.continuationToken,
      },
      200,
      { "x-eve-session-id": created.eveSessionId }
    );
  } catch (error) {
    console.error("[agent-chats] Session creation failed", error);
    return c.json({ error: "Agent session creation failed" }, 502);
  }
});

agentChatsRoutes.openAPIRegistry.registerPath(
  createRoute({
    method: "post",
    path: "/eve/v1/session/{sessionId}",
    tags: ["Agent"],
    operationId: "sendAgentSessionMessage",
    summary: "Send a follow-up message or answer a pending input request",
    description:
      "Sends the next turn of an agent session. The server binds the session's stored continuation token, so the client-provided one is ignored. Answer input.requested events (tool approvals, questions) from the event stream via inputResponses.",
    request: {
      params: agentSessionParamsSchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: sendAgentMessageRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description:
          "Upstream eve response with the next continuation token for this session.",
        content: {
          "application/json": { schema: { type: "object" as const } },
        },
      },
      400: errorResponse("Invalid request body"),
      404: errorResponse("Session not found"),
      409: errorResponse("A message is already being processed"),
      429: chatRateLimitResponse,
      500: errorResponse("Failed to check usage limits"),
      ...commonErrorResponses,
    },
  })
);

agentChatsRoutes.post("/eve/v1/session/:sessionId", async (c) => {
  const context = await requireAgentContext(c);
  if (!context.ok) {
    return context.response;
  }
  const sessionId = c.req.param("sessionId");
  const mapping = await getAgentSessionMapping(
    context.organizationId,
    sessionId
  );
  if (!mapping) {
    return c.json({ error: "Session not found" }, 404);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = sendAgentMessageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
  if (!(parsed.data.message || parsed.data.inputResponses?.length)) {
    return c.json({ error: "Invalid request body" }, 400);
  }
  const credits = await checkAgentAiCredits(context.organizationId);
  if (!credits.allowed) {
    return c.json({ error: credits.error, code: credits.code }, credits.status);
  }

  const client = await createAgentClient({
    organizationId: context.organizationId,
    userId: mapping.userId ?? undefined,
    chatId: mapping.chatId ?? undefined,
    useMarkup: credits.useMarkup,
    chargeAiCredits: credits.chargeAiCredits,
  });
  try {
    return await forwardAgentFollowUp({
      fetchUpstream: (path, init) => client.fetch(path, init),
      eveSessionId: sessionId,
      continuationToken: mapping.continuationToken,
      message: parsed.data.message,
      inputResponses: parsed.data.inputResponses,
    });
  } catch (error) {
    if (error instanceof AgentSendLockedError) {
      return c.json(
        { error: "A message is already being processed for this session" },
        409
      );
    }
    throw error;
  }
});

agentChatsRoutes.openAPIRegistry.registerPath(
  createRoute({
    method: "get",
    path: "/eve/v1/session/{sessionId}/stream",
    tags: ["Agent"],
    operationId: "streamAgentSessionEvents",
    summary: "Stream an agent session's events",
    description:
      "Durable, replayable eve session event stream (newline-delimited JSON). Pass startIndex to resume from a known position. Includes input.requested events for tool approvals.",
    request: { params: agentSessionParamsSchema },
    responses: {
      200: {
        description: "NDJSON event stream",
        content: {
          "application/x-ndjson": { schema: { type: "string" as const } },
        },
      },
      404: errorResponse("Session not found"),
      429: chatRateLimitResponse,
      ...commonErrorResponses,
    },
  })
);

agentChatsRoutes.get("/eve/v1/session/:sessionId/stream", async (c) => {
  const context = await requireAgentContext(c);
  if (!context.ok) {
    return context.response;
  }
  const sessionId = c.req.param("sessionId");
  const mapping = await getAgentSessionMapping(
    context.organizationId,
    sessionId
  );
  if (!mapping) {
    return c.json({ error: "Session not found" }, 404);
  }

  const client = await createAgentClient({
    organizationId: context.organizationId,
  });
  return await forwardAgentStream({
    fetchUpstream: (path, init) => client.fetch(path, init),
    eveSessionId: sessionId,
    startIndex: c.req.query("startIndex"),
  });
});

const listAgentChatsRoute = createRoute({
  method: "get",
  path: "/agent-chats",
  tags: ["Agent"],
  operationId: "listAgentChats",
  summary: "List agent sessions",
  request: { query: listAgentChatsQuerySchema },
  responses: {
    200: {
      description: "Agent sessions fetched successfully",
      content: {
        "application/json": { schema: listAgentChatsResponseSchema },
      },
    },
    429: chatRateLimitResponse,
    ...commonErrorResponses,
  },
});

agentChatsRoutes.openapi(listAgentChatsRoute, async (c) => {
  if (!isAgentApiEnabled()) {
    return c.json({ error: "Agent service is not configured" }, 503);
  }
  const organizationId = getOrganizationId(c);
  if (!organizationId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }
  const rateLimited = await enforceRatelimit(
    c,
    ratelimit.chatGeneration,
    "organization"
  );
  if (rateLimited) {
    return rateLimited;
  }
  const { limit } = c.req.valid("query");
  const sessions = await listAgentSessionMappings(organizationId, limit);
  return c.json(
    {
      sessions: sessions.map((session) => ({
        sessionId: session.eveSessionId,
        chatId: session.chatId,
        surface: session.surface,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      })),
    },
    200
  );
});
