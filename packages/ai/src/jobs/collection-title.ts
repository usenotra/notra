import {
  COLLECTION_TITLE_EXCERPT_LENGTH,
  COLLECTION_TITLE_MAX_IMAGES,
  COLLECTION_TITLE_MAX_POSTS,
  COLLECTION_TITLE_MODEL_ID,
} from "@notra/ai/constants/collection-title";
import { gateway } from "@notra/ai/gateway";
import { COLLECTION_TITLE_SYSTEM_PROMPT } from "@notra/ai/prompts/collection-title";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { collectionTitleResultSchema } from "@notra/ai/schemas/collection-title";
import type {
  GenerateCollectionTitleParams,
  MaybeGenerateCollectionTitleParams,
} from "@notra/ai/types/collection-title";
import { logError } from "@notra/ai/utils/server-log";
import { buildTelemetryOptions } from "@notra/ai/utils/tcc";
import { db } from "@notra/db/drizzle";
import { organizations, postCollections, posts } from "@notra/db/schema";
import { isLegacyPostCollectionName } from "@notra/db/utils/post-collections";
import { type FilePart, generateText, Output, type TextPart } from "ai";
import { and, asc, eq, ne } from "drizzle-orm";

const HTML_TAG_REGEX = /<[^>]+>/g;
const WHITESPACE_REGEX = /\s+/g;

const IMAGE_CONTENT_TYPE = "image";

function buildPostExcerpt(markdown: string | null, content: string) {
  const source = markdown ?? content.replace(HTML_TAG_REGEX, " ");
  return source
    .replace(WHITESPACE_REGEX, " ")
    .trim()
    .slice(0, COLLECTION_TITLE_EXCERPT_LENGTH);
}

export async function generateCollectionTitle(
  params: GenerateCollectionTitleParams
): Promise<string | null> {
  const collectionPosts = await db
    .select({
      title: posts.title,
      contentType: posts.contentType,
      markdown: posts.markdown,
      content: posts.content,
    })
    .from(posts)
    .where(
      and(
        eq(posts.collectionId, params.collectionId),
        eq(posts.organizationId, params.organizationId)
      )
    )
    .orderBy(asc(posts.createdAt))
    .limit(COLLECTION_TITLE_MAX_POSTS);

  if (collectionPosts.length === 0) {
    return null;
  }

  const organization = await db.query.organizations.findFirst({
    columns: { name: true },
    where: eq(organizations.id, params.organizationId),
  });

  const postSummaries = collectionPosts.map((post, index) => {
    const label = post.contentType.replaceAll("_", " ");
    const excerpt =
      post.contentType === IMAGE_CONTENT_TYPE
        ? ""
        : buildPostExcerpt(post.markdown, post.content);
    return [`Post ${index + 1} (${label}): ${post.title}`, excerpt]
      .filter(Boolean)
      .join("\n");
  });

  const imageParts = collectionPosts
    .filter(
      (post) =>
        post.contentType === IMAGE_CONTENT_TYPE &&
        post.content.startsWith("http")
    )
    .slice(0, COLLECTION_TITLE_MAX_IMAGES)
    .map((post): FilePart => ({
      type: "file",
      mediaType: "image",
      data: new URL(post.content),
    }));

  const promptText = [
    organization ? `Organization: ${organization.name}` : null,
    ...postSummaries,
  ]
    .filter(Boolean)
    .join("\n\n");
  const userContent: Array<TextPart | FilePart> = [
    { type: "text", text: promptText },
    ...imageParts,
  ];

  const { output } = await generateText({
    model: gateway(COLLECTION_TITLE_MODEL_ID, {
      organizationId: params.organizationId,
    }),
    output: Output.object({ schema: collectionTitleResultSchema }),
    instructions: COLLECTION_TITLE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    providerOptions: withRouterDefaults(
      {
        gateway: { tags: ["content-collection-title"] },
        openai: { reasoningEffort: "none" },
      },
      {
        modelId: COLLECTION_TITLE_MODEL_ID,
      }
    ),
    ...buildTelemetryOptions({
      feature: "collection_title",
      organizationId: params.organizationId,
      collectionId: params.collectionId,
    }),
  });

  const title = output.title.trim();
  if (!title) {
    return null;
  }

  if (!params.dryRun) {
    await db
      .update(postCollections)
      .set({
        name: title,
        nameSource: params.nameSource ?? "generated",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(postCollections.id, params.collectionId),
          eq(postCollections.organizationId, params.organizationId),
          ne(postCollections.nameSource, "user")
        )
      );
  }

  return title;
}

export async function maybeGenerateCollectionTitle(
  params: MaybeGenerateCollectionTitleParams
) {
  try {
    const collection = await db.query.postCollections.findFirst({
      columns: {
        name: true,
        nameSource: true,
        expectedPostCount: true,
        completedPostCount: true,
      },
      where: and(
        eq(postCollections.id, params.collectionId),
        eq(postCollections.organizationId, params.organizationId)
      ),
    });

    if (
      !collection ||
      collection.nameSource === "user" ||
      !isLegacyPostCollectionName(collection.name)
    ) {
      return;
    }

    const isComplete =
      collection.expectedPostCount === null ||
      collection.completedPostCount >= collection.expectedPostCount;
    if (!isComplete) {
      return;
    }

    await generateCollectionTitle({
      collectionId: params.collectionId,
      organizationId: params.organizationId,
      nameSource: collection.nameSource,
    });
  } catch (error) {
    logError("[CollectionTitle] Failed to generate collection title", error, {
      collectionId: params.collectionId,
      organizationId: params.organizationId,
    });
  }
}
