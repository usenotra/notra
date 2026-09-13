import { generateRepoImage } from "@notra/ai/agents/repo-image";
import { maybeGenerateCollectionTitle } from "@notra/ai/jobs/collection-title";
import { sanitizeToneNotes } from "@notra/ai/prompts/user";
import { isGitHubRateLimitError } from "@notra/ai/tools/github";
import {
  uploadGeneratedHtmlAsset,
  uploadGeneratedImageAsset,
} from "@notra/ai/utils/image-assets";
import { db } from "@notra/db/drizzle";
import { postCollections, posts } from "@notra/db/schema";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import type {
  ContentGenerationContext,
  ContentGenerationResult,
} from "../types";

export async function handleImage(
  ctx: ContentGenerationContext
): Promise<ContentGenerationResult> {
  const repository = ctx.repositories[0];

  if (!(repository && ctx.userId)) {
    return {
      status: "generation_failed",
      reason: repository
        ? "User context is required to generate an image."
        : "At least one GitHub repository is required to generate an image.",
    };
  }

  try {
    const title = `Image for ${repository.owner}/${repository.repo}`;
    const result = await generateRepoImage({
      input: {
        organizationId: ctx.organizationId,
        integrationId: repository.integrationId,
        branch: repository.defaultBranch ?? "main",
        mode: "prompt",
        prompt: buildImagePrompt(ctx),
      },
      snapshotName: `image-${ctx.organizationId}-${Date.now()}`,
      userId: ctx.userId,
    });

    const postId = nanoid();
    const imageUrl = await uploadGeneratedImageAsset({
      organizationId: ctx.organizationId,
      pngBase64: result.pngBase64,
      postId,
    });
    const htmlUrl = await uploadGeneratedHtmlAsset({
      organizationId: ctx.organizationId,
      html: result.html,
      postId,
    });
    await db.transaction(async (tx) => {
      await tx.insert(posts).values({
        id: postId,
        organizationId: ctx.organizationId,
        collectionId: ctx.collectionId,
        title,
        slug: null,
        content: imageUrl,
        htmlUrl,
        markdown: null,
        recommendations: null,
        contentType: "image",
        status: ctx.autoPublish ? "published" : "draft",
        sourceMetadata: {
          ...ctx.sourceMetadata,
          type: "generated_image",
          integrationId: repository.integrationId,
          branch: repository.defaultBranch ?? "main",
          mode: "prompt",
          sandbox: result.sandbox,
          usage: result.usage ?? null,
        },
      });
      await tx
        .update(postCollections)
        .set({
          completedPostCount: sql`${postCollections.completedPostCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(postCollections.id, ctx.collectionId));
    });

    await maybeGenerateCollectionTitle({
      collectionId: ctx.collectionId,
      organizationId: ctx.organizationId,
    });

    return {
      status: "ok",
      postId,
      title,
      posts: [{ postId, title, recommendations: null }],
      usage: result.usage,
    };
  } catch (error) {
    if (isGitHubRateLimitError(error)) {
      return {
        status: "rate_limited",
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }

    return {
      status: "generation_failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildSelectedItemsContext(ctx: ContentGenerationContext): string {
  const filters = ctx.selectionFilters;

  if (!filters) {
    return "";
  }

  const lines: string[] = [];

  const commitShas = filters.allowedCommitShas ?? [];
  if (commitShas.length > 0) {
    lines.push(
      `Commits: ${commitShas.join(", ")}. Read each one with \`git show <sha>\` to see exactly what code changed.`
    );
  }

  const prNumbers = Object.values(
    filters.allowedPullRequestNumbersByIntegrationId ?? {}
  ).flat();
  if (prNumbers.length > 0) {
    lines.push(
      `Pull requests: ${prNumbers.map((number) => `#${number}`).join(", ")}. Read each diff with \`gh pr diff <number>\` (or \`git show\` on its merge commit) to see exactly what code changed.`
    );
  }

  const releaseTags = [
    ...(filters.allowedReleaseTagsGlobal ?? []),
    ...Object.values(filters.allowedReleaseTagsByIntegrationId ?? {}).flat(),
  ];
  if (releaseTags.length > 0) {
    lines.push(
      `Releases: ${releaseTags.join(", ")}. Inspect the code these tags introduced.`
    );
  }

  if (lines.length === 0) {
    return "";
  }

  return [
    "This image must be about ONLY these specific items the user cherry-picked. Open the code they changed, understand what the change does for the user, and design the image around that outcome. Do not depict any other repository activity.",
    ...lines,
  ].join("\n");
}

function buildImagePrompt(ctx: ContentGenerationContext) {
  const selectedItemsContext = buildSelectedItemsContext(ctx);
  const toneNotes = sanitizeToneNotes(ctx.promptInput.customTone);
  const promptParts = [
    `Create a polished 1200x630 marketing asset for: ${ctx.promptInput.sourceTargets}.`,
    selectedItemsContext ||
      `Use repository activity from ${ctx.promptInput.lookbackLabel} (${ctx.promptInput.lookbackStartIso} to ${ctx.promptInput.lookbackEndIso}).`,
    ctx.promptInput.companyName
      ? `Company name: ${ctx.promptInput.companyName}.`
      : "",
    ctx.promptInput.companyDescription
      ? `Company description: ${ctx.promptInput.companyDescription}.`
      : "",
    ctx.promptInput.audience ? `Audience: ${ctx.promptInput.audience}.` : "",
    ctx.promptInput.tone ? `Tone: ${ctx.promptInput.tone}.` : "",
    toneNotes ? `Tone notes: ${toneNotes}.` : "",
    ctx.promptInput.customInstructions ?? "",
  ];

  return promptParts.filter(Boolean).join("\n");
}
