import { getChatProjectId } from "@notra/ai/chat/history";
import { maybeGenerateCollectionTitle } from "@notra/ai/jobs/collection-title";
import { POST_SLUG_MAX_LENGTH } from "@notra/ai/schemas/post";
import type {
  CreatePostRecordParams,
  CreatePostRecordResult,
  EnsureChatPostCollectionParams,
  PostDatabase,
  UpdatePostRecordParams,
  UpdatePostRecordResult,
} from "@notra/ai/types/post-service";
import { sanitizeMarkdownHtml } from "@notra/ai/utils/sanitize";
import { db } from "@notra/db/drizzle";
import { postCollections, posts } from "@notra/db/schema";
import { buildPostCollectionName } from "@notra/db/utils/post-collections";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { marked } from "marked";
import { customAlphabet } from "nanoid";

const generatePostId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  16
);

function isPostSlugConflict(error: unknown): boolean {
  for (let current = error, depth = 0; current && depth < 6; depth++) {
    if (
      typeof current === "object" &&
      (("code" in current &&
        current.code === "23505" &&
        "constraint" in current &&
        current.constraint === "posts_org_slug_uidx") ||
        (current instanceof Error &&
          current.message.includes("posts_org_slug_uidx")))
    ) {
      return true;
    }
    current =
      typeof current === "object" && "cause" in current
        ? current.cause
        : undefined;
  }
  return false;
}

function uniquifySlug(slug: string, n: number) {
  const suffix = `-${n}`;
  return `${slug.slice(0, POST_SLUG_MAX_LENGTH - suffix.length)}${suffix}`;
}

export async function createPostRecord(
  params: CreatePostRecordParams
): Promise<CreatePostRecordResult> {
  const id = params.postId ?? generatePostId();
  const content = sanitizeMarkdownHtml(await marked.parse(params.markdown));
  const baseSlug = params.slug ?? null;

  const insert = async (slug: string | null) =>
    db.transaction(async (tx) => {
      const inserted = await tx
        .insert(posts)
        .values({
          id,
          organizationId: params.organizationId,
          collectionId: params.collectionId,
          title: params.title,
          slug,
          content,
          markdown: params.markdown,
          recommendations: params.recommendations ?? null,
          contentType: params.contentType,
          contentSubtype: params.contentSubtype ?? null,
          status: params.autoPublish ? "published" : "draft",
          sourceMetadata: params.sourceMetadata ?? null,
        })
        .onConflictDoNothing({ target: posts.id })
        .returning({ id: posts.id });

      if (inserted.length === 0) {
        return true;
      }

      await tx
        .update(postCollections)
        .set({
          completedPostCount: sql`${postCollections.completedPostCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(postCollections.id, params.collectionId),
            eq(postCollections.organizationId, params.organizationId)
          )
        );
      return false;
    });

  let slug = baseSlug;
  let deduplicated = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      deduplicated = await insert(slug);
      break;
    } catch (error) {
      if (!(baseSlug && isPostSlugConflict(error) && attempt < 5)) {
        throw error;
      }
      slug = uniquifySlug(baseSlug, attempt + 2);
    }
  }

  if (!deduplicated) {
    await maybeGenerateCollectionTitle({
      collectionId: params.collectionId,
      organizationId: params.organizationId,
    });
  }

  return { postId: id, deduplicated };
}

export async function updatePostRecord(
  params: UpdatePostRecordParams,
  database: PostDatabase = db
): Promise<UpdatePostRecordResult> {
  const updates: Record<string, string | null> = {};
  if (params.title !== undefined) {
    updates.title = params.title;
  }
  if (params.slug !== undefined) {
    updates.slug = params.slug;
  }
  if (params.markdown !== undefined) {
    updates.content = sanitizeMarkdownHtml(await marked.parse(params.markdown));
    updates.markdown = params.markdown;
  }
  if (params.recommendations !== undefined) {
    updates.recommendations = params.recommendations;
  }
  if (params.contentSubtype !== undefined) {
    updates.contentSubtype = params.contentSubtype;
  }

  if (Object.keys(updates).length === 0) {
    return { status: "no_changes" };
  }

  const rows = await database
    .update(posts)
    .set(updates)
    .where(
      and(
        eq(posts.id, params.postId),
        eq(posts.organizationId, params.organizationId)
      )
    )
    .returning({ id: posts.id });

  return { status: rows.length === 0 ? "not_found" : "updated" };
}

export async function ensureChatPostCollection(
  params: EnsureChatPostCollectionParams
): Promise<string> {
  const now = new Date();
  const contentTypesJson = JSON.stringify([params.contentType]);
  const projectId = params.chatId
    ? await getChatProjectId(params.organizationId, params.chatId)
    : null;

  const [collection] = await db
    .insert(postCollections)
    .values({
      id: generatePostId(),
      organizationId: params.organizationId,
      projectId,
      source: "chat",
      sourceId: params.chatId ?? null,
      name: buildPostCollectionName([params.contentType], now),
      nameSource: "generated",
      contentTypes: [params.contentType],
      expectedPostCount: null,
      completedPostCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        postCollections.organizationId,
        postCollections.source,
        postCollections.sourceId,
      ],
      targetWhere: and(
        eq(postCollections.source, "chat"),
        isNotNull(postCollections.sourceId)
      ),
      set: {
        projectId,
        contentTypes: sql`CASE
          WHEN ${postCollections.contentTypes} @> ${contentTypesJson}::jsonb
            THEN ${postCollections.contentTypes}
          ELSE ${postCollections.contentTypes} || ${contentTypesJson}::jsonb
        END`,
        updatedAt: now,
      },
    })
    .returning({ id: postCollections.id });

  if (!collection) {
    throw new Error("Failed to create the chat post collection");
  }

  return collection.id;
}
