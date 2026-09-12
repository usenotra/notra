import type { ContextItem, TextSelection } from "@notra/ai/types/chat";
import type { contentChatMessageMetadataSchema } from "@notra/schemas/dashboard/content";
import type { z } from "zod";

export type ContentChatMessageMetadata = z.infer<
  typeof contentChatMessageMetadataSchema
>;

export interface ContentChatAttachments {
  selection: TextSelection | null;
  context: ContextItem[];
}
