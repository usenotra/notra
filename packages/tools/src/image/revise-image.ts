import {
  deleteRepoImageSnapshot,
  generateRepoImage,
} from "@notra/ai/agents/repo-image";
import {
  uploadGeneratedHtmlAsset,
  uploadGeneratedImageAsset,
} from "@notra/ai/utils/image-assets";
import {
  buildRevisionSourceMetadata,
  getImageSnapshot,
  trackImageGenerationUsage,
} from "@notra/ai/utils/image-post-service";
import { redis } from "@notra/ai/utils/redis";
import { logError } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { defineTool } from "eve/tools";

import { reviseImageInputSchema } from "../schemas/image-tools";
import { deriveOperationHash } from "../utils/idempotency";
import { requireOrganizationId } from "../utils/organization";
import {
  getBooleanSessionAttribute,
  getSessionAttribute,
} from "../utils/session";

export function createReviseImageTool() {
  return defineTool({
    description:
      "Revises a previously generated marketing asset by restoring its saved sandbox snapshot, applying the requested visual change, rendering a new 1200x630 PNG, saving it back to the image content item, and snapshotting the sandbox again. Describe the requested visual change in prompt. Revisions are long-running operations that usually take 3 to 8 minutes.",
    inputSchema: reviseImageInputSchema,
    async execute({ postId: inputPostId, prompt, title }, ctx) {
      const organizationId = requireOrganizationId(ctx);
      const userId = getSessionAttribute(ctx, "userId") ?? null;
      const useMarkup = getBooleanSessionAttribute(ctx, "useMarkup");
      const chargeAiCredits =
        getSessionAttribute(ctx, "chargeAiCredits") !== "false";
      const postId = inputPostId ?? getSessionAttribute(ctx, "contentId");
      if (!postId) {
        throw new Error(
          "revise_image needs a postId: pass it in the input or run inside a content editor session."
        );
      }

      const post = await db.query.posts.findFirst({
        where: and(
          eq(posts.id, postId),
          eq(posts.organizationId, organizationId)
        ),
      });
      if (!post) {
        throw new Error("Source image post not found");
      }

      const revisionKey = `agent:revise-image:${ctx.session.id}:${ctx.session.turn.id}:${postId}:${deriveOperationHash(`${prompt} ${title ?? ""}`)}`;
      if (redis) {
        const claimed = await redis.set(revisionKey, "1", {
          nx: true,
          ex: 60 * 60 * 24,
        });
        if (claimed !== "OK") {
          return {
            postId,
            title: post.title,
            imageUrl: post.content,
            status: "updated",
            contentType: "image",
            sandbox: null,
            usage: null,
          };
        }
      }
      try {
        const metadata =
          post.sourceMetadata && typeof post.sourceMetadata === "object"
            ? post.sourceMetadata
            : {};
        const integrationId =
          "integrationId" in metadata &&
          typeof metadata.integrationId === "string"
            ? metadata.integrationId
            : null;
        const branch =
          "branch" in metadata && typeof metadata.branch === "string"
            ? metadata.branch
            : null;
        if (!(integrationId && branch)) {
          throw new Error(
            "The image post is missing its repository metadata and cannot be revised."
          );
        }

        const previousSnapshot = await getImageSnapshot(organizationId, postId);
        const nextTitle = title ?? post.title;

        const result = await generateRepoImage({
          input: {
            organizationId,
            integrationId,
            branch,
            brandIdentityId: previousSnapshot.brandIdentityId,
            mode: "prompt",
            prompt,
          },
          restoreSnapshotId: previousSnapshot.snapshotId,
          snapshotName: `image-${organizationId}-${Date.now()}`,
          userId,
        });

        const [imageUrl, htmlUrl] = await Promise.all([
          uploadGeneratedImageAsset({
            organizationId,
            pngBase64: result.pngBase64,
            postId,
          }),
          uploadGeneratedHtmlAsset({
            organizationId,
            html: result.html,
            postId,
          }),
        ]);
        const sourceMetadata = await buildRevisionSourceMetadata({
          organizationId,
          postId,
          integrationId,
          branch,
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
            and(eq(posts.id, postId), eq(posts.organizationId, organizationId))
          );

        await deleteRepoImageSnapshot(previousSnapshot).catch((error) => {
          logError("Failed to delete previous repo image snapshot", error, {
            postId,
            snapshotId: previousSnapshot.snapshotId,
          });
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
          title: nextTitle,
          imageUrl,
          status: "updated",
          contentType: "image",
          sandbox: result.sandbox,
          usage: result.usage ?? null,
        };
      } catch (error) {
        if (redis) {
          await redis.del(revisionKey).catch(() => null);
        }
        throw error;
      }
    },
  });
}
