import { generateRepoImage } from "@notra/ai/agents/repo-image";
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
  getImageSnapshot,
  saveGeneratedImagePost,
  trackImageGenerationUsage,
} from "@notra/ai/utils/image-post-service";
import { reviseImagePost } from "@notra/ai/utils/image-revision";
import { type Tool, tool } from "ai";

export function createImageTool(config: ImageToolConfig): Tool {
  return tool({
    description: toolDescription({
      toolName: "createImage",
      intro:
        "Generates a 1200x630 image from a connected GitHub repository in a sandbox: a marketing asset, or with format diagram a hand-drawn Excalidraw explainer diagram the user can edit and paste into Excalidraw or tldraw. Saves the image as content and snapshots the sandbox for later follow-up work.",
      whenToUse:
        "When the user asks to create, generate, revise, or continue a marketing image, visual, social card, or a diagram (architecture, flow, how something works, Excalidraw, tldraw, whiteboard sketch) from repository context.",
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
          // A follow-up keeps the source image's format unless asked otherwise.
          format: input.format ?? restoreSnapshot?.format,
          prompt: input.prompt,
          prNumber: input.prNumber,
          commitSha: input.commitSha,
        },
        restoreSnapshotId: restoreSnapshot?.snapshotId,
        restoreDiagramSpec: restoreSnapshot?.diagramSpec,
        snapshotName: `image-${config.organizationId}-${Date.now()}`,
        userId: config.userId,
      });

      const { imageUrl, postId } = await saveGeneratedImagePost({
        chatId: config.chatId,
        organizationId: config.organizationId,
        title,
        pngBase64: result.pngBase64,
        html: result.html,
        result,
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
        "Revises the current generated image. Marketing assets restore their saved sandbox snapshot, apply the requested visual change, render a new 1200x630 PNG, and snapshot the sandbox again. Diagrams are edited directly and re-rendered in a few seconds.",
      whenToUse:
        "When editing or revising the current image content item. Use this instead of markdown editing.",
      usageNotes:
        "Describe the requested visual change in prompt. Marketing asset revisions usually take 3–8 minutes; diagram edits take seconds unless useRepository is set because the change needs new facts from the code. The tool UI shows a persistent elapsed timer. The current image post ID, repository integration, branch, and sandbox snapshot are supplied automatically.",
    }),
    inputSchema: imageRevisionToolInputSchema,
    execute: async ({ prompt, title, useRepository }) =>
      await reviseImagePost({
        organizationId: config.organizationId,
        postId: config.postId,
        prompt,
        title,
        useRepository,
        userId: config.userId,
        useMarkup: config.useMarkup,
        chargeAiCredits: config.chargeAiCredits,
      }),
  });
}
