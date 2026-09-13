import type { Redis } from "@upstash/redis";
import type { LanguageModelUsage, UIMessage } from "ai";
import type * as z from "zod";

import type {
  chatMessageMetadataSchema,
  chatModelSchema,
  chatSessionSummarySchema,
  chatSurfaceSchema,
  chatTransportRequestInputSchema,
  chatWorkflowPayloadSchema,
  externalChannelIdSchema,
  externalChannelLookupSourceSchema,
  externalChannelSourceSchema,
  storedChatPreferencesSchema,
  thinkingLevelSchema,
  updateChatSessionSchema,
} from "../schemas/chat";
import type {
  ContextItem as OrchestrationContextItem,
  TextSelection as OrchestrationTextSelection,
} from "./orchestration";

export type TextSelection = OrchestrationTextSelection;
export type ContextItem = OrchestrationContextItem;
export type StandaloneChatContextItem = OrchestrationContextItem;
export type ChatModel = z.infer<typeof chatModelSchema>;
export type ThinkingLevel = z.infer<typeof thinkingLevelSchema>;
export type ChatMessageMetadata = z.infer<typeof chatMessageMetadataSchema>;
export type ChatUIMessage = UIMessage<ChatMessageMetadata>;
export type StoredChatPreferences = z.infer<typeof storedChatPreferencesSchema>;
export type ChatSessionSummary = z.infer<typeof chatSessionSummarySchema>;
export type ChatSurface = z.infer<typeof chatSurfaceSchema>;
export type ExternalChannelSource = z.infer<typeof externalChannelSourceSchema>;
export type ExternalChannelLookupSource = z.infer<
  typeof externalChannelLookupSourceSchema
>;
export type ExternalChannelId = z.infer<typeof externalChannelIdSchema>;
export type UpdateChatSessionInput = z.infer<typeof updateChatSessionSchema>;
export type ChatWorkflowPayload = z.infer<typeof chatWorkflowPayloadSchema>;
export type ChatTransportRequestInput = z.infer<
  typeof chatTransportRequestInputSchema
>;

export interface ChatUsageSnapshot {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface ChatImageAttachmentProps {
  url: string;
  filename: string | undefined;
  mediaType: string;
  onClick: () => void;
}

export interface ChatInputHandle {
  setText: (text: string) => void;
  submit: () => void;
  focus: () => void;
}

export type MirrorChatStatus = "working" | "idle";

export interface ChatAttachment {
  url: string;
  key: string;
  filename: string;
  mediaType: string;
  size: number;
}

export type ChatMessagePart =
  | { type: "text"; text: string }
  | {
      type: "file";
      url: string;
      mediaType: string;
      filename?: string;
    };

export interface BuildChatFinishMetadataInput {
  streamStartedAt: number;
  firstChunkAt: number | null;
  finishedAt: number;
  partUsage: LanguageModelUsage | undefined;
  usageSnapshot: ChatUsageSnapshot;
  model?: ChatModel | string;
  requestedModel?: ChatModel | string;
  thinkingLevel?: ThinkingLevel;
  requestedThinkingLevel?: ThinkingLevel;
}

export interface ChatConfig {
  redis: Redis | null;
}

export interface StartChatAbortPollingArgs {
  organizationId: string;
  chatId: string;
  streamId: string;
  onAbort: () => void;
  intervalMs?: number;
}
