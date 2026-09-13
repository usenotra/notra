import {
  COLLECTION_TITLE_EXCERPT_LENGTH,
  COLLECTION_TITLE_MAX_IMAGES,
  COLLECTION_TITLE_MAX_POSTS,
  COLLECTION_TITLE_MODEL_ID,
} from "@notra/ai/constants/collection-title";
import { gateway } from "@notra/ai/gateway";
import { withRouterDefaults } from "@notra/ai/provider-options";
import {
  COLLECTION_TITLE_MAX_LENGTH,
  collectionTitleResultSchema,
} from "@notra/ai/schemas/collection-title";
import type {
  GenerateCollectionTitleParams,
  MaybeGenerateCollectionTitleParams,
} from "@notra/ai/types/collection-title";
import { buildExperimentalTelemetry } from "@notra/ai/utils/tcc";
import { db } from "@notra/db/drizzle";
import { organizations, postCollections, posts } from "@notra/db/schema";
import { isLegacyPostCollectionName } from "@notra/db/utils/post-collections";
import { generateObject, type ImagePart, type TextPart } from "ai";
import { and, asc, eq, ne } from "drizzle-orm";

const HTML_TAG_REGEX = /<[^>]+>/g;
const WHITESPACE_REGEX = /\s+/g;

const IMAGE_CONTENT_TYPE = "image";

const SYSTEM_PROMPT = [
  "You write display titles for batches of AI-generated content shown in the Notra dashboard.",
  "Read the posts in the batch and produce one short title that captures what the batch is actually about.",
  `Requirements: at most ${COLLECTION_TITLE_MAX_LENGTH} characters, plain text, sentence case, no dates, no surrounding quotes, no trailing punctuation.`,
  "Write a concise noun phrase with the main subject first, then what the content covers.",
  'Good examples: "Acme onboarding flow revamp", "Voice control and PR workflow fixes", "Custom MCP server integrations".',
  "Copy product, company, and feature names exactly as they are spelled in the posts. Never add spaces, change casing, or otherwise normalize them; if the posts spell a name in more than one way, use the most frequent spelling.",
  'Never use GitHub repository slugs like "owner/repo" as a name; use the product or company name people would say out loud.',
  "The organization name is provided for context; when the posts refer to the same company or product, prefer the organization's spelling.",
  'When the posts are images or other visual assets, describe the artifact itself, like "SentDM Next.js app preview" or "Acme dashboard promo graphic".',
  "Attached images are the actual visual assets in the batch; look at them and describe what they depict.",
  'Do not use generic labels like "Changelog", "Blog post", or "LinkedIn post" as the title.',
  'Do not use vague filler such as "updates", "improvements", "services", or "preview" on their own; name the concrete features, fixes, announcements, or themes the posts cover.',
].join(" ");

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
    .map((post): ImagePart => ({
      type: "image",
      image: new URL(post.content),
    }));

  const promptText = [
    organization ? `Organization: ${organization.name}` : null,
    ...postSummaries,
  ]
    .filter(Boolean)
    .join("\n\n");
  const userContent: Array<TextPart | ImagePart> = [
    { type: "text", text: promptText },
    ...imageParts,
  ];

  const { object } = await generateObject({
    model: gateway(COLLECTION_TITLE_MODEL_ID, {
      organizationId: params.organizationId,
    }),
    schema: collectionTitleResultSchema,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    providerOptions: withRouterDefaults(undefined, {
      modelId: COLLECTION_TITLE_MODEL_ID,
    }),
    experimental_telemetry: buildExperimentalTelemetry({
      feature: "collection_title",
      organizationId: params.organizationId,
      collectionId: params.collectionId,
    }),
  });

  const title = object.title.trim();
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
    console.error("[CollectionTitle] Failed to generate collection title", {
      collectionId: params.collectionId,
      organizationId: params.organizationId,
      error,
    });
  }
}
