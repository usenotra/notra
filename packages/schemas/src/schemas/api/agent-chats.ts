import "zod/compile";
import { z } from "@hono/zod-openapi";

const AGENT_MESSAGE_MAX_LENGTH = 200_000;
const AGENT_SESSION_LIST_LIMIT_MAX = 50;

export const createAgentSessionRequestSchema = z
  .object({
    message: z
      .string()
      .min(1)
      .max(AGENT_MESSAGE_MAX_LENGTH)
      .openapi({ description: "The first user message of the session." }),
  })
  .openapi("CreateAgentSessionRequest");

export const createAgentSessionResponseSchema = z
  .object({
    ok: z.literal(true),
    sessionId: z.string(),
    continuationToken: z.string(),
  })
  .openapi("CreateAgentSessionResponse");

const agentInputResponseSchema = z.object({
  requestId: z.string().min(1),
  optionId: z.string().min(1).openapi({
    description:
      'The chosen option id from the input.requested event, e.g. "approve" or "deny".',
  }),
});

export const sendAgentMessageRequestSchema = z
  .object({
    message: z
      .string()
      .min(1)
      .max(AGENT_MESSAGE_MAX_LENGTH)
      .optional()
      .openapi({
        description:
          "The next user message. Omit when only answering a pending input request.",
      }),
    inputResponses: z.array(agentInputResponseSchema).optional().openapi({
      description:
        "Answers to pending input.requested events (tool approvals, questions) from the event stream.",
    }),
    continuationToken: z.string().min(1).openapi({
      description:
        "The continuation token returned by the previous request for this session.",
    }),
  })
  .openapi("SendAgentMessageRequest");

export const agentSessionParamsSchema = z.object({
  sessionId: z
    .string()
    .min(1)
    .openapi({ param: { name: "sessionId" } }),
});

export const listAgentChatsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(AGENT_SESSION_LIST_LIMIT_MAX)
    .default(20),
});

const agentSessionSummarySchema = z
  .object({
    sessionId: z.string(),
    chatId: z.string().nullable(),
    surface: z.string(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AgentSessionSummary");

export const listAgentChatsResponseSchema = z
  .object({
    sessions: z.array(agentSessionSummarySchema),
  })
  .openapi("ListAgentChatsResponse");
