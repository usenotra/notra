import type { ContentType } from "@notra/ai/schemas/content";
import type { PostSourceMetadata } from "@notra/db/schema";
import type { BlogPostSubtype } from "@notra/db/types/content";

import type { PostSummary } from "./posts";

export interface PostToolsConfig {
  organizationId: string;
  collectionId?: string;
  chatId?: string;
  contentType: ContentType;
  contentSubtype?: BlogPostSubtype | null;
  sourceMetadata?: PostSourceMetadata;
  autoPublish?: boolean;
  needsApproval?: boolean;
  targetPostId?: string;
}

export interface PostToolsResult {
  postId?: string;
  title?: string;
  posts?: PostSummary[];
  failReason?: string;
  skipReason?: string;
}
