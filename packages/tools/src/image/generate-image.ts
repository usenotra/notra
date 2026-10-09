import { generateRepoImage } from "@notra/ai/agents/repo-image";
import { imageToolInputSchema } from "@notra/ai/schemas/repo-image";
import {
  getImageSnapshot,
  saveGeneratedImagePost,
  trackImageGenerationUsage,
} from "@notra/ai/utils/image-post-service";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { defineTool } from "eve/tools";

import { deriveDeterministicPostId } from "../utils/idempotency";
import { requireOrganizationId } from "../utils/organization";
import {
  getBooleanSessionAttribute,
  getSessionAttribute,
} from "../utils/session";

export function createGenerateImageTool() {
  return defineTool({
    description:
      "Generates a 1200x630 marketing asset from a connected GitHub repository in a sandbox, saves the image as content, and snapshots the sandbox for later follow-up work. Requires integrationId and branch. Generation is a long-running operation that usually takes 3 to 8 minutes. For revisions of a prior generated image, pass sourcePostId so the sandbox can be restored from its snapshot.",
    inputSchema: imageToolInputSchema,
    async execute({ sourcePostId, title, ...input }, ctx) {
      const organizationId = requireOrganizationId(ctx);
      const userId = getSessionAttribute(ctx, "userId") ?? null;
      const chatId = getSessionAttribute(ctx, "chatId") ?? undefined;
      const useMarkup = getBooleanSessionAttribute(ctx, "useMarkup");
      const chargeAiCredits =
        getSessionAttribute(ctx, "chargeAiCredits") !== "false";

      const deterministicPostId = deriveDeterministicPostId(
        ctx,
        `generate_image:${JSON.stringify({ ...input, sourcePostId, title })}`
      );
      const existing = await db.query.posts.findFirst({
        where: and(
          eq(posts.id, deterministicPostId),
          eq(posts.organizationId, organizationId)
        ),
      });
      if (existing) {
        return {
          postId: existing.id,
          title: existing.title,
          imageUrl: existing.content,
          status: "created",
          contentType: "image",
          sandbox: null,
          usage: null,
        };
      }

      const restoreSnapshot = sourcePostId
        ? await getImageSnapshot(organizationId, sourcePostId)
        : null;
      const brandIdentityId =
        input.brandIdentityId ?? restoreSnapshot?.brandIdentityId;

      const result = await generateRepoImage({
        input: {
          organizationId,
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
        snapshotName: `image-${organizationId}-${Date.now()}`,
        userId,
      });

      const { imageUrl, postId } = await saveGeneratedImagePost({
        chatId,
        organizationId,
        title,
        postId: deterministicPostId,
        pngBase64: result.pngBase64,
        html: result.html,
        result,
        sourceMetadata: {
          type: "generated_image",
          chatId: chatId ?? null,
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
        organizationId,
        postId,
        usage: result.usage,
        useMarkup,
        chargeAiCredits,
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
