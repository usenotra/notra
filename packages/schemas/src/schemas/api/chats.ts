import "zod/compile";
import { z } from "@hono/zod-openapi";
import {
  chatModelSchema,
  externalChannelLookupSourceSchema,
  externalChannelSourceSchema,
  thinkingLevelSchema,
} from "@notra/ai/schemas/chat";
import { standaloneChatContextSchema } from "@notra/ai/schemas/standalone-chat";

const publicExternalChannelSourceSchema = z.enum([
  "discord",
  "slack",
  "dashboard",
]);

const publicExternalChannelIdSchema = z
  .object({
    source: publicExternalChannelSourceSchema,
    id: z.string().max(200).optional(),
  })
  .refine(
    (value) =>
      value.source === "dashboard" ||
      (typeof value.id === "string" && value.id.length > 0),
    { message: "id is required for discord and slack sources" }
  )
  .openapi("PublicExternalChannelId");

const externalChannelIdSchema = z
  .object({
    source: externalChannelSourceSchema,
    id: z.string().max(200).optional(),
  })
  .refine(
    (value) =>
      value.source === "dashboard" ||
      value.source === "agent" ||
      (typeof value.id === "string" && value.id.length > 0),
    { message: "id is required for discord and slack sources" }
  )
  .openapi("ExternalChannelId");

export const chatSessionSummarySchema = z
  .object({
    chatId: z.string(),
    title: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    pinnedAt: z.string().nullable(),
    externalChannelId: externalChannelIdSchema.nullable().optional(),
  })
  .openapi("ChatSessionSummary");

const uiMessageSchema = z.unknown().openapi("ChatMessage");

export const getChatParamsSchema = z.object({
  chatId: z
    .string()
    .min(1)
    .openapi({
      param: { name: "chatId", in: "path" },
      example: "chat_abc123",
    }),
});

export const sendChatMessageRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(50_000).openapi({
      description: "The user message to send.",
      example: "Summarize what shipped in the last week.",
    }),
    model: chatModelSchema.optional().openapi({
      description:
        "Model to respond with. Defaults to auto, which lets Notra choose.",
      example: "auto",
    }),
    enableThinking: z.boolean().optional().openapi({
      description: "Allow the model to reason before answering.",
      example: false,
    }),
    thinkingLevel: thinkingLevelSchema.optional().openapi({
      description:
        "How much reasoning effort to spend when thinking is enabled.",
      example: "medium",
    }),
    timezone: z.string().min(1).max(100).optional().openapi({
      description:
        "IANA time zone used to interpret dates in the conversation.",
      example: "Europe/Berlin",
    }),
    context: z.array(standaloneChatContextSchema).optional().openapi({
      description:
        "Integrations the assistant may use as tools in this chat: connected GitHub repositories, Linear teams, or MCP servers.",
    }),
    externalChannelId: publicExternalChannelIdSchema.optional().openapi({
      description:
        "Link the chat to a Discord or Slack channel so it can be found later with GET /v1/chats/by-external.",
    }),
  })
  .openapi("SendChatMessageRequest");

export const getChatByExternalQuerySchema = z.object({
  source: externalChannelLookupSourceSchema.openapi({
    param: { name: "source", in: "query" },
    description: "Messaging platform the channel belongs to.",
    example: "discord",
  }),
  id: z
    .string()
    .min(1)
    .max(200)
    .openapi({
      param: { name: "id", in: "query" },
      description: "Channel ID on that platform.",
      example: "channel_123",
    }),
});

export const sendChatParamsSchema = z.object({
  chatId: z
    .string()
    .min(1)
    .openapi({
      param: { name: "chatId", in: "path" },
      example: "chat_abc123",
    }),
});

export const getChatsResponseSchema = z
  .object({
    chats: z.array(chatSessionSummarySchema),
  })
  .openapi("GetChatsResponse");

export const getChatResponseSchema = z
  .object({
    chat: chatSessionSummarySchema,
    messages: z.array(uiMessageSchema),
  })
  .openapi("GetChatResponse");
