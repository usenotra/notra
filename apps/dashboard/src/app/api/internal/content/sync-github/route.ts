import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { postGitHubSyncRequestSchema } from "@notra/schemas/api/post-github-sync";
import { postGitHubPublishSchema } from "@notra/schemas/dashboard/content";
import { and, eq } from "drizzle-orm";

import { assertActiveSubscription } from "@/lib/billing/subscription";
import { publishSavedContentToGitHub } from "@/lib/integrations/github/publish-saved-content";
import { verifyInternalWorkflowRequest } from "@/lib/workflows/internal-auth";
import { ratelimit } from "@/utils/ratelimit";

export async function POST(request: Request) {
  if (!(await verifyInternalWorkflowRequest(request))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = postGitHubSyncRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { organizationId, postId, actorId } = parsed.data;
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.organizationId, organizationId)),
    columns: { contentType: true, githubPublish: true },
  });
  if (!post) {
    return Response.json({ error: "Post not found" }, { status: 404 });
  }
  if (
    !post.githubPublish ||
    (post.contentType !== "blog_post" && post.contentType !== "changelog")
  ) {
    return Response.json({ success: true });
  }

  try {
    const linked = postGitHubPublishSchema.parse(post.githubPublish);
    await assertActiveSubscription(organizationId);
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      const { success, limit, remaining, reset } =
        await ratelimit.githubPublish.limit(`${actorId}:${organizationId}`);
      if (!success) {
        return Response.json(
          {
            error: "Too many GitHub publish requests",
            limit,
            remaining,
            reset,
          },
          { status: 429 }
        );
      }
    }
    await publishSavedContentToGitHub({
      organizationId,
      contentId: postId,
      contentType: post.contentType,
      repositoryId: linked.repositoryId,
      linkedOnly: true,
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to sync saved post to GitHub", { postId, error });
    return Response.json(
      { error: "Failed to update the linked GitHub pull request" },
      { status: 502 }
    );
  }
}
