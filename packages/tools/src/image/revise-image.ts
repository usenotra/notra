import { reviseImagePost } from "@notra/ai/utils/image-revision";
import { redis } from "@notra/ai/utils/redis";
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
      "Revises a previously generated image. Marketing assets restore their saved sandbox snapshot, apply the requested visual change, render a new 1200x630 PNG, and snapshot the sandbox again; this usually takes 3 to 8 minutes. Diagrams are edited directly in a few seconds unless useRepository is set. Describe the requested visual change in prompt.",
    inputSchema: reviseImageInputSchema,
    async execute({ postId: inputPostId, prompt, title, useRepository }, ctx) {
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

      // Only for answering a repeated call with the current image.
      const post = await db.query.posts.findFirst({
        columns: { title: true, content: true },
        where: and(
          eq(posts.id, postId),
          eq(posts.organizationId, organizationId)
        ),
      });
      if (!post) {
        throw new Error("Source image post not found");
      }

      const revisionKey = `agent:revise-image:${ctx.session.id}:${ctx.session.turn.id}:${postId}:${deriveOperationHash(`${prompt} ${title ?? ""} ${useRepository ? "repository" : ""}`)}`;
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
        return await reviseImagePost({
          organizationId,
          postId,
          prompt,
          title,
          useRepository,
          userId,
          useMarkup,
          chargeAiCredits,
        });
      } catch (error) {
        if (redis) {
          await redis.del(revisionKey).catch(() => null);
        }
        throw error;
      }
    },
  });
}
