import { createRoute } from "@hono/zod-openapi";
import {
  getStandaloneChatSession,
  getChatSessionByExternalChannel,
  listChatSessions,
  loadChatHistory,
} from "@notra/ai/chat/history";
import { useLogger, withEvlog } from "@notra/ai/evlog";
import {
  chatSessionSummarySchema,
  getChatByExternalQuerySchema,
  getChatParamsSchema,
  getChatResponseSchema,
  getChatsResponseSchema,
  sendChatMessageRequestSchema,
  sendChatParamsSchema,
} from "@notra/schemas/api/chats";
import type { Context } from "hono";
import { nanoid } from "nanoid";

import { runChatMessage } from "../lib/chat/run";
import { getOrganizationId } from "../utils/auth";
import { createOpenApiApp, formatValidationError } from "../utils/openapi-app";
import { errorResponse, rateLimitResponse } from "../utils/openapi-responses";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";

export const chatsRoutes = createOpenApiApp();

const listChatsRoute = createRoute({
  method: "get",
  path: "/chats",
  tags: ["Chats"],
  operationId: "listChats",
  summary: "List chats",
  description:
    "Returns the organization's chat sessions without their messages. Use GET /v1/chats/{chatId} to load a conversation.",
  responses: {
    200: {
      description: "Chats fetched successfully",
      content: { "application/json": { schema: getChatsResponseSchema } },
    },
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const getChatByExternalRoute = createRoute({
  method: "get",
  path: "/chats/by-external",
  tags: ["Chats"],
  operationId: "getChatByExternalChannel",
  summary: "Get a chat by external channel id",
  description:
    "Looks up the chat session linked to a Discord or Slack channel. Link a chat by passing externalChannelId when you create it.",
  request: { query: getChatByExternalQuerySchema },
  responses: {
    200: {
      description: "Chat fetched successfully",
      content: { "application/json": { schema: chatSessionSummarySchema } },
    },
    400: errorResponse("Invalid query params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Chat not found"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const getChatRoute = createRoute({
  method: "get",
  path: "/chats/{chatId}",
  tags: ["Chats"],
  operationId: "getChat",
  summary: "Get a single chat with messages",
  description:
    "Returns the chat session and its full message history in UI message format.",
  request: { params: getChatParamsSchema },
  responses: {
    200: {
      description: "Chat fetched successfully",
      content: { "application/json": { schema: getChatResponseSchema } },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Chat not found"),
    503: errorResponse("Authentication service unavailable"),
  },
});

chatsRoutes.openapi(listChatsRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const chats = await listChatSessions(orgId);
  return c.json({ chats }, 200);
});

chatsRoutes.openapi(getChatByExternalRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const { source, id } = c.req.valid("query");
  const chat = await getChatSessionByExternalChannel(orgId, source, id);

  if (!chat) {
    return c.json({ error: "Chat not found" }, 404);
  }

  return c.json(chat, 200);
});

chatsRoutes.openapi(getChatRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const { chatId } = c.req.valid("param");
  const chat = await getStandaloneChatSession(orgId, chatId);

  if (!chat) {
    return c.json({ error: "Chat not found" }, 404);
  }

  const messages = await loadChatHistory(orgId, chatId);
  return c.json({ chat, messages }, 200);
});

async function handleSend(
  c: Context,
  existingChatId: string | null
): Promise<Response> {
  const requestId = nanoid(10);
  const log = useLogger();

  try {
    const organizationId = getOrganizationId(c);
    if (!organizationId) {
      return c.json(
        { error: "Forbidden: API key must be scoped to an organization" },
        403
      );
    }

    log.set({
      feature: "standalone_chat",
      organizationId,
      requestId,
    });

    const body = await c.req.json().catch(() => null);
    const parseResult = sendChatMessageRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json({ error: formatValidationError(parseResult.error) }, 400);
    }

    const rateLimited = await enforceRatelimit(
      c,
      ratelimit.chatGeneration,
      "organization"
    );
    if (rateLimited) {
      return rateLimited;
    }

    return await runChatMessage({
      c,
      organizationId,
      existingChatId,
      body: parseResult.data,
      log,
      requestId,
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("[Standalone Chat] Error:", {
      requestId,
      error: errorMessage,
      stack: e instanceof Error ? e.stack : undefined,
    });
    return c.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? errorMessage
            : "Failed to process chat request",
      },
      500
    );
  }
}

chatsRoutes.post(
  "/chats",
  withEvlog((c: Context) => handleSend(c, null))
);

chatsRoutes.post(
  "/chats/:chatId",
  withEvlog((c: Context) => handleSend(c, c.req.param("chatId") ?? null))
);

const streamingChatResponses = {
  200: {
    description:
      "Streaming UI message stream (newline-delimited JSON chunks). Read the `X-Chat-Id` response header for the chat id, or take it from the `start` chunk's `messageMetadata.chatId`.",
    content: {
      "text/event-stream": {
        schema: { type: "string" as const },
      },
    },
  },
  400: errorResponse("Invalid request body"),
  401: errorResponse("Missing or invalid API key"),
  403: errorResponse("Forbidden, or usage limit reached"),
  404: errorResponse("Chat not found"),
  429: rateLimitResponse(
    RATE_LIMITS.chatGeneration.requests,
    RATE_LIMITS.chatGeneration.window
  ),
  500: errorResponse("Failed to process chat request"),
  503: errorResponse("Authentication service unavailable"),
};

chatsRoutes.openAPIRegistry.registerPath({
  method: "post",
  path: "/chats",
  tags: ["Chats"],
  operationId: "createChat",
  summary: "Start a new chat and stream the reply",
  description:
    "Creates a chat session, sends the first message, and streams the assistant reply. Read the X-Chat-Id response header to continue the conversation with POST /v1/chats/{chatId}.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: sendChatMessageRequestSchema },
      },
    },
  },
  responses: streamingChatResponses,
});

chatsRoutes.openAPIRegistry.registerPath({
  method: "post",
  path: "/chats/{chatId}",
  tags: ["Chats"],
  operationId: "postChatMessage",
  summary: "Post a message to an existing chat and stream the reply",
  description:
    "Appends a user message to the chat and streams the assistant reply. Earlier messages in the chat are included as context automatically.",
  request: {
    params: sendChatParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": { schema: sendChatMessageRequestSchema },
      },
    },
  },
  responses: streamingChatResponses,
});
