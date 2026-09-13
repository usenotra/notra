import type { UIMessage } from "ai";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import { CHAT_TITLE_MAX_LENGTH } from "../constants/chat";
import { standaloneChatContextSchema } from "./standalone-chat";

export const chatModelSchema = z.enum([
  "auto",
  "anthropic/claude-opus-5",
  "anthropic/claude-opus-4.8",
  "anthropic/claude-sonnet-5",
  "anthropic/claude-sonnet-4.6",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5.4",
  "openai/gpt-5.5",
]);

export const thinkingLevelSchema = z.enum(["off", "low", "medium", "high"]);

export const chatIdSchema = z.uuid();

export const externalChannelSourceSchema = z.enum([
  "discord",
  "slack",
  "dashboard",
  "agent",
]);

export const externalChannelLookupSourceSchema = z.enum(["discord", "slack"]);

export const externalChannelIdSchema = z
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
  );

export const relayChatMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

export const slackRelayMetadataSchema = z.object({
  chat_id: z.string().min(1),
  organization_id: z.string().min(1),
  user_name: z.string().min(1).max(200),
  text: z.string().min(1).max(4000),
});

export const chatMessageMetadataSchema = z.object({
  chatId: z.string().min(1).optional(),
  authorUserId: z.string().min(1).max(200).optional(),
  model: chatModelSchema.optional(),
  requestedModel: chatModelSchema.optional(),
  thinkingLevel: thinkingLevelSchema.optional(),
  requestedThinkingLevel: thinkingLevelSchema.optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  ttftMs: z.number().nonnegative().optional(),
  generationDurationMs: z.number().nonnegative().optional(),
  tokensPerSecond: z.number().nonnegative().optional(),
  createdAt: z.number().int().nonnegative().optional(),
  externalChannelId: externalChannelIdSchema.optional(),
});

export const UI_MESSAGES_MAX = 200;

const uiMessagePartSchema = z
  .looseObject({
    type: z.string().min(1).max(100),
    text: z.string().max(100_000).optional(),
  })
  .refine((part) => part.type !== "text" || typeof part.text === "string", {
    message: "Text parts must include a text string",
  });

export const uiMessageSchema = z.object({
  id: z.string().min(1).max(200),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(uiMessagePartSchema).min(1).max(50),
  metadata: z.looseObject({}).optional(),
}) as unknown as z.ZodType<UIMessage>;

export const chatSurfaceSchema = z.enum(["chat", "dashboard-agent"]);

export const standaloneChatRequestSchema = z.object({
  chatId: chatIdSchema.optional(),
  projectId: z.string().min(1).optional(),
  messages: z.array(uiMessageSchema).min(1).max(UI_MESSAGES_MAX),
  context: z.array(standaloneChatContextSchema).optional(),
  model: chatModelSchema.optional(),
  enableThinking: z.boolean().optional(),
  thinkingLevel: thinkingLevelSchema.optional(),
  timezone: z.string().min(1).max(100).optional(),
  surface: chatSurfaceSchema.default("chat"),
});

export const dashboardAgentChatRequestSchema = z.object({
  chatId: chatIdSchema,
  projectId: z.string().min(1).optional(),
  messages: z.array(uiMessageSchema).min(1).max(UI_MESSAGES_MAX),
  timezone: z.string().min(1).max(100).optional(),
});

export const updateChatSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(CHAT_TITLE_MAX_LENGTH).optional(),
    pinned: z.boolean().optional(),
  })
  .refine(
    (value) =>
      Number(value.title !== undefined) + Number(value.pinned !== undefined) ===
      1,
    {
      message: "Provide exactly one update operation",
    }
  );

export const chatWorkflowPayloadSchema = z.object({
  requestId: z.string().min(1),
  organizationId: z.string().min(1),
  chatId: z.string().min(1),
  userId: z.string().min(1),
  userEmail: z.string().email().nullable().optional(),
  context: z.array(standaloneChatContextSchema),
  useMarkup: z.boolean(),
  model: chatModelSchema.optional(),
  enableThinking: z.boolean().optional(),
  thinkingLevel: thinkingLevelSchema.optional(),
  timezone: z.string().min(1).max(100).optional(),
  projectId: z.string().min(1).optional(),
  surface: chatSurfaceSchema.default("chat"),
});

export const chatTransportRequestBodySchema = z.object({
  chatId: z.string().min(1),
  messages: z.array(
    z.object({
      id: z.string().min(1).optional(),
    })
  ),
});

const chatTransportRequestJsonSchema = z
  .string()
  .transform((value, context) => {
    try {
      return JSON.parse(value);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid transport request JSON",
      });
      return z.NEVER;
    }
  });

export const chatTransportRequestInputSchema = z.union([
  chatTransportRequestBodySchema,
  chatTransportRequestJsonSchema.pipe(chatTransportRequestBodySchema),
]);

export const chatErrorPayloadSchema = z.object({
  error: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
});

export const storedChatPreferencesSchema = z.object({
  model: chatModelSchema,
  thinkingLevel: thinkingLevelSchema,
});

export const chatSessionSummarySchema = z.object({
  chatId: z.string().min(1),
  title: z.string().min(1),
  updatedAt: z.string().min(1),
  createdAt: z.string().min(1),
  pinnedAt: z.string().min(1).nullable(),
  externalChannelId: externalChannelIdSchema.nullable().optional(),
});

export const chatSessionResponseSchema = z.object({
  session: chatSessionSummarySchema.optional(),
});

export const chatSessionsListResponseSchema = z.object({
  sessions: z.array(chatSessionSummarySchema).optional(),
});
