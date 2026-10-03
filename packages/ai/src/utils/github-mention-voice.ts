import type { GitHubMentionVoice } from "@notra/ai/types/github-mention";
import { db } from "@notra/db/drizzle";
import { brandSettings, posts } from "@notra/db/schema";
import type { PostSourceMetadata } from "@notra/db/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * The brand voice the post was written in, or the organization's default one.
 * An edit made from a pull request should sound like the rest of the post.
 */
export async function loadGitHubMentionVoice(params: {
  organizationId: string;
  postId: string | null;
}): Promise<GitHubMentionVoice | null> {
  const post = params.postId
    ? await db.query.posts.findFirst({
        where: and(
          eq(posts.id, params.postId),
          eq(posts.organizationId, params.organizationId)
        ),
        columns: { sourceMetadata: true },
      })
    : null;
  const voiceId = (post?.sourceMetadata as PostSourceMetadata | null)
    ?.brandVoiceId;
  const columns = {
    name: true,
    companyName: true,
    companyDescription: true,
    toneProfile: true,
    customTone: true,
    customInstructions: true,
    audience: true,
    language: true,
  } as const;
  const voice =
    (voiceId
      ? await db.query.brandSettings.findFirst({
          where: and(
            eq(brandSettings.organizationId, params.organizationId),
            eq(brandSettings.id, voiceId)
          ),
          columns,
        })
      : null) ??
    (await db.query.brandSettings.findFirst({
      where: eq(brandSettings.organizationId, params.organizationId),
      orderBy: [desc(brandSettings.isDefault), desc(brandSettings.createdAt)],
      columns,
    }));
  return voice ?? null;
}
