import type { ContentType } from "@notra/ai/schemas/content";
import type { db } from "@notra/db/drizzle";
import type { PostSourceMetadata } from "@notra/db/schema";
import type { BlogPostSubtype } from "@notra/db/types/content";

export type PostDatabase = Pick<typeof db, "update">;

export interface CreatePostRecordParams {
  organizationId: string;
  collectionId: string;
  contentType: ContentType;
  contentSubtype?: BlogPostSubtype | null;
  title: string;
  slug?: string | null;
  markdown: string;
  recommendations?: string | null;
  autoPublish?: boolean;
  sourceMetadata?: PostSourceMetadata | null;
  postId?: string;
}

export interface CreatePostRecordResult {
  postId: string;
  deduplicated: boolean;
}

export interface UpdatePostRecordParams {
  organizationId: string;
  postId: string;
  title?: string;
  slug?: string | null;
  markdown?: string;
  recommendations?: string | null;
  contentSubtype?: BlogPostSubtype | null;
  /** Only update while the stored markdown still equals this value. */
  expectedMarkdown?: string | null;
}

export interface UpdatePostRecordResult {
  status: "updated" | "not_found" | "no_changes";
}

export interface EnsureChatPostCollectionParams {
  organizationId: string;
  chatId?: string | null;
  contentType: ContentType;
}
