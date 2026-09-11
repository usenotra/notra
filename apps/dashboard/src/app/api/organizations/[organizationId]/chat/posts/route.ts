import { getChatProjectId } from "@notra/ai/chat/history";
import { maybeGenerateCollectionTitle } from "@notra/ai/jobs/collection-title";
import { supportsPostSlug } from "@notra/ai/schemas/post";
import { sanitizeMarkdownHtml } from "@notra/ai/utils/sanitize";
import { db } from "@notra/db/drizzle";
import { postCollections, posts } from "@notra/db/schema";
import {
  buildPostCollectionName,
  isLegacyPostCollectionName,
} from "@notra/db/utils/post-collections";
import { createChatPostSchema } from "@notra/schemas/dashboard/content";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { marked } from "marked";
import { nanoid } from "nanoid";
import { after, NextResponse } from "next/server";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import type { RouteContext } from "@/types/api/routes";

export async function POST(
  request: Request,
  { params }: RouteContext<{ organizationId: string }>
) {
  const { organizationId } = await params;

  await assertOrganizationAccess({
    headers: request.headers,
    organizationId,
  });

  const parsed = createChatPostSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid post payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { chatId, title, contentType, markdown, status } = parsed.data;
  const slug =
    supportsPostSlug(contentType) && parsed.data.slug ? parsed.data.slug : null;
  const content = sanitizeMarkdownHtml(await marked.parse(markdown));
  const id = nanoid();
  const collectionId = nanoid();
  const now = new Date();
  const contentTypesJson = JSON.stringify([contentType]);
  const projectId = await getChatProjectId(organizationId, chatId);
  const result = await db.transaction(async (tx) => {
    const [collection] = await tx
      .insert(postCollections)
      .values({
        id: collectionId,
        organizationId,
        projectId,
        source: "chat",
        sourceId: chatId,
        name: buildPostCollectionName([contentType], now),
        nameSource: "generated",
        contentTypes: [contentType],
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
      .returning({
        id: postCollections.id,
        contentTypes: postCollections.contentTypes,
        createdAt: postCollections.createdAt,
        name: postCollections.name,
        nameSource: postCollections.nameSource,
      });

    if (!collection) {
      return null;
    }

    if (
      collection.nameSource === "generated" &&
      isLegacyPostCollectionName(collection.name)
    ) {
      await tx
        .update(postCollections)
        .set({
          name: buildPostCollectionName(
            Array.isArray(collection.contentTypes)
              ? collection.contentTypes
              : [contentType],
            collection.createdAt
          ),
          updatedAt: now,
        })
        .where(eq(postCollections.id, collection.id));
    }

    await tx.insert(posts).values({
      id,
      organizationId,
      collectionId: collection.id,
      title,
      slug,
      content,
      markdown,
      contentType,
      status,
      sourceMetadata: null,
    });

    return { postId: id, collectionId: collection.id };
  });

  if (!result) {
    return NextResponse.json(
      { error: "Failed to create chat collection" },
      { status: 500 }
    );
  }

  after(async () => {
    await maybeGenerateCollectionTitle({
      collectionId: result.collectionId,
      organizationId,
    });
  });

  return NextResponse.json({ postId: result.postId, status });
}
