import {
  deleteRepoImageSnapshot,
  generateRepoImage,
} from "@notra/ai/agents/repo-image";
import {
  imageRevisionToolInputSchema,
  imageToolInputSchema,
} from "@notra/ai/schemas/repo-image";
import type {
  ImageRevisionToolConfig,
  ImageToolConfig,
} from "@notra/ai/types/repo-image";
import { toolDescription } from "@notra/ai/utils/description";
import {
  uploadGeneratedHtmlAsset,
  uploadGeneratedImageAsset,
} from "@notra/ai/utils/image-assets";
import {
  buildRevisionSourceMetadata,
  getImageSnapshot,
  saveGeneratedImagePost,
  trackImageGenerationUsage,
} from "@notra/ai/utils/image-post-service";
import { logError } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { type Tool, tool } from "ai";
import { and, eq } from "drizzle-orm";

export function createImageTool(config: ImageToolConfig): Tool {
  return tool({
    description: toolDescription({
      toolName: "createImage",
      intro:
        "Generates a 1200x630 marketing asset from a connected GitHub repository in a sandbox, saves the image as content, and snapshots the sandbox for later follow-up work.",
      whenToUse:
        "When the user asks to create, generate, revise, or continue a marketing image, visual, or social card from repository context.",
      usageNotes:
        "Requires integrationId and branch. Generation is a long-running operation that usually takes 3–8 minutes; the tool UI shows a persistent elapsed timer. For revisions, pass sourcePostId when the user refers to a prior generated image so the sandbox can be restored from its snapshot.",
    }),
    inputSchema: imageToolInputSchema,
    execute: async ({ sourcePostId, title, ...input }) => {
      const restoreSnapshot = sourcePostId
        ? await getImageSnapshot(config.organizationId, sourcePostId)
        : null;
      const brandIdentityId =
        input.brandIdentityId ?? restoreSnapshot?.brandIdentityId;

      const result = await generateRepoImage({
        input: {
          organizationId: config.organizationId,
          integrationId: input.integrationId,
          branch: input.branch,
          brandIdentityId,
          mode: input.mode,
          prompt: input.prompt,
          prNumber: input.prNumber,
          commitSha: input.commitSha,
        },
        restoreSnapshotId: restoreSnapshot?.snapshotId,
        snapshotName: `image-${config.organizationId}-${Date.now()}`,
        userId: config.userId,
      });

      const { imageUrl, postId } = await saveGeneratedImagePost({
        chatId: config.chatId,
        organizationId: config.organizationId,
        title,
        pngBase64: result.pngBase64,
        html: result.html,
        sourceMetadata: {
          type: "generated_image",
          chatId: config.chatId ?? null,
          integrationId: input.integrationId,
          branch: input.branch,
          brandIdentityId: result.brandIdentityId ?? brandIdentityId ?? null,
          mode: input.mode,
          prompt: input.prompt ?? null,
          prNumber: input.prNumber ?? null,
          commitSha: input.commitSha ?? null,
          sourcePostId: sourcePostId ?? null,
          sandbox: result.sandbox,
          usage: result.usage ?? null,
        },
      });

      await trackImageGenerationUsage({
        organizationId: config.organizationId,
        postId,
        usage: result.usage,
        useMarkup: config.useMarkup,
      });

      return {
        postId,
        title,
        imageUrl,
        status: "created",
        contentType: "image",
        sandbox: result.sandbox,
        usage: result.usage ?? null,
      };
    },
  });
}

export function createImageRevisionTool(config: ImageRevisionToolConfig): Tool {
  return tool({
    description: toolDescription({
      toolName: "reviseImage",
      intro:
        "Revises the current generated marketing asset by restoring its saved sandbox snapshot, applying the requested visual change, rendering a new 1200x630 PNG, saving it back to this image content item, and snapshotting the sandbox again.",
      whenToUse:
        "When editing or revising the current image content item. Use this instead of markdown editing.",
      usageNotes:
        "Describe the requested visual change in prompt. Revisions are long-running operations that usually take 3–8 minutes; the tool UI shows a persistent elapsed timer. The current image post ID, repository integration, branch, and sandbox snapshot are supplied automatically.",
    }),
    inputSchema: imageRevisionToolInputSchema,
    execute: async ({ prompt, title }) => {
      const previousSnapshot = await getImageSnapshot(
        config.organizationId,
        config.postId
      );
      const nextTitle = title ?? config.title;

      const result = await generateRepoImage({
        input: {
          organizationId: config.organizationId,
          integrationId: config.integrationId,
          branch: config.branch,
          brandIdentityId: config.brandIdentityId,
          mode: "prompt",
          prompt,
        },
        restoreSnapshotId: previousSnapshot.snapshotId,
        snapshotName: `image-${config.organizationId}-${Date.now()}`,
        userId: config.userId,
      });

      const imageUrl = await uploadGeneratedImageAsset({
        organizationId: config.organizationId,
        pngBase64: result.pngBase64,
        postId: config.postId,
      });
      const htmlUrl = await uploadGeneratedHtmlAsset({
        organizationId: config.organizationId,
        html: result.html,
        postId: config.postId,
      });
      const sourceMetadata = await buildRevisionSourceMetadata({
        organizationId: config.organizationId,
        postId: config.postId,
        integrationId: config.integrationId,
        branch: config.branch,
        prompt,
        result,
      });

      await db
        .update(posts)
        .set({
          title: nextTitle,
          content: imageUrl,
          htmlUrl,
          markdown: null,
          sourceMetadata,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(posts.id, config.postId),
            eq(posts.organizationId, config.organizationId)
          )
        );

      await deleteRepoImageSnapshot(previousSnapshot).catch((error) => {
        logError("[repo-image] Failed to delete previous snapshot", error, {
          postId: config.postId,
          snapshotId: previousSnapshot.snapshotId,
        });
      });

      await trackImageGenerationUsage({
        organizationId: config.organizationId,
        postId: config.postId,
        usage: result.usage,
        useMarkup: config.useMarkup,
      });

      return {
        postId: config.postId,
        title: nextTitle,
        imageUrl,
        status: "updated",
        contentType: "image",
        sandbox: result.sandbox,
        usage: result.usage ?? null,
      };
    },
  });
}
