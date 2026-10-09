import {
  deleteRepoImageSnapshot,
  generateRepoImage,
} from "@notra/ai/agents/repo-image";
import {
  canEditDiagramWithoutSandbox,
  readImageFormat,
} from "@notra/ai/utils/diagram-metadata";
import { reviseDiagramPost } from "@notra/ai/utils/diagram-post";
import {
  uploadGeneratedHtmlAsset,
  uploadGeneratedImageAsset,
} from "@notra/ai/utils/image-assets";
import {
  buildRevisionSourceMetadata,
  getImageSnapshot,
  trackImageGenerationUsage,
} from "@notra/ai/utils/image-post-service";
import { logError } from "@notra/ai/utils/server-log";
import { isRecord, readString } from "@notra/ai/utils/unknown-record";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

interface ReviseImagePostParams {
  organizationId: string;
  postId: string;
  prompt: string;
  title?: string;
  /** Diagrams only: edit in the sandbox because the change needs the code. */
  useRepository?: boolean;
  userId: string | null;
  useMarkup?: boolean;
  chargeAiCredits?: boolean;
}

/**
 * Applies a requested change to a generated image post. Diagrams are edited
 * directly in seconds; marketing images (and diagram changes that need the
 * code) restore the post's sandbox snapshot and run the image agent again.
 */
export async function reviseImagePost(params: ReviseImagePostParams) {
  const post = await db.query.posts.findFirst({
    where: and(
      eq(posts.id, params.postId),
      eq(posts.organizationId, params.organizationId)
    ),
  });
  if (!post) {
    throw new Error("Source image post not found");
  }

  if (
    !params.useRepository &&
    canEditDiagramWithoutSandbox(post.sourceMetadata)
  ) {
    return await reviseDiagramPost(params);
  }

  const metadata = isRecord(post.sourceMetadata) ? post.sourceMetadata : {};
  const integrationId = readString(metadata, "integrationId");
  const branch = readString(metadata, "branch");
  if (!(integrationId && branch)) {
    throw new Error(
      "The image post is missing its repository metadata and cannot be revised."
    );
  }

  const { organizationId, postId, prompt } = params;
  const previousSnapshot = await getImageSnapshot(organizationId, postId);
  const nextTitle = params.title ?? post.title;

  const result = await generateRepoImage({
    input: {
      organizationId,
      integrationId,
      branch,
      brandIdentityId: previousSnapshot.brandIdentityId,
      mode: "prompt",
      prompt,
      // From the post, not from files in the restored repo: a customer repo
      // can contain its own diagram.json.
      format: readImageFormat(post.sourceMetadata),
    },
    restoreSnapshotId: previousSnapshot.snapshotId,
    restoreDiagramSpec: previousSnapshot.diagramSpec,
    snapshotName: `image-${organizationId}-${Date.now()}`,
    userId: params.userId,
  });

  const [imageUrl, htmlUrl, sourceMetadata] = await Promise.all([
    uploadGeneratedImageAsset({
      organizationId,
      pngBase64: result.pngBase64,
      postId,
    }),
    uploadGeneratedHtmlAsset({ organizationId, html: result.html, postId }),
    buildRevisionSourceMetadata({
      organizationId,
      postId,
      integrationId,
      branch,
      prompt,
      result,
    }),
  ]);

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
    .where(and(eq(posts.id, postId), eq(posts.organizationId, organizationId)));

  await deleteRepoImageSnapshot(previousSnapshot).catch((error) => {
    logError("[repo-image] Failed to delete previous snapshot", error, {
      postId,
      snapshotId: previousSnapshot.snapshotId,
    });
  });

  await trackImageGenerationUsage({
    organizationId,
    postId,
    usage: result.usage,
    useMarkup: params.useMarkup,
    chargeAiCredits: params.chargeAiCredits,
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
}
