import type { ChatMessageMetadata } from "@notra/ai/types/chat";

export interface AssistantMetadataHoverProps {
  metadata: ChatMessageMetadata | undefined;
  compact?: boolean;
}

export interface AssistantTokenUsageProps {
  metadata: ChatMessageMetadata;
  outputTokens: number;
}
