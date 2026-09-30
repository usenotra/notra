import { chatMessageMetadataSchema } from "@notra/ai/schemas/chat";
import type { ChatMessageMetadata } from "@notra/ai/types/chat";

export function parseChatMessageMetadata(
  metadata: unknown
): ChatMessageMetadata | undefined {
  const parsed = chatMessageMetadataSchema.safeParse(metadata);
  return parsed.success ? parsed.data : undefined;
}
