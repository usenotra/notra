import type { ContextItem, TextSelection } from "@notra/ai/types/chat";
import { contentChatMessageMetadataSchema } from "@notra/schemas/dashboard/content";

import type {
  ContentChatAttachments,
  ContentChatMessageMetadata,
} from "@/types/content/chat";

export function snapshotContentChatAttachments(
  selection: TextSelection | null,
  context: ContextItem[]
): ContentChatMessageMetadata {
  return {
    ...(selection ? { selection } : {}),
    ...(context.length > 0 ? { context: [...context] } : {}),
  };
}

export function getContentChatAttachments(
  metadata: unknown
): ContentChatAttachments {
  const parsed = contentChatMessageMetadataSchema.safeParse(metadata);
  if (!parsed.success) {
    return { selection: null, context: [] };
  }

  return {
    selection: parsed.data.selection ?? null,
    context: parsed.data.context ?? [],
  };
}

export function hasContentChatAttachments(
  attachments: ContentChatAttachments
): boolean {
  return attachments.selection !== null || attachments.context.length > 0;
}
