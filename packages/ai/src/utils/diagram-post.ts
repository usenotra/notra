import type { DiagramSpec } from "@notra/ai/types/excalidraw-diagram";
import { editDiagramSpecWithAi } from "@notra/ai/utils/diagram-edit";
import {
  readDiagramRevision,
  readDiagramSpec,
} from "@notra/ai/utils/diagram-metadata";
import { renderDiagram } from "@notra/ai/utils/excalidraw-render";
import {
  uploadGeneratedExcalidrawAsset,
  uploadGeneratedHtmlAsset,
  uploadGeneratedImageAsset,
} from "@notra/ai/utils/image-assets";
import { trackImageGenerationUsage } from "@notra/ai/utils/image-post-service";
import { isRecord } from "@notra/ai/utils/unknown-record";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq, sql } from "drizzle-orm";

// Saving diagram edits on a post: hand edits from the editor and fast chat
// edits, both compare-and-set on the post's diagram revision.

/** Thrown when the diagram changed between reading and saving it. */
export class DiagramConflictError extends Error {
  constructor() {
    super(
      "The diagram changed while this edit was in progress. Reload it and try again."
    );
    this.name = "DiagramConflictError";
  }
}

export function isDiagramConflictError(
  error: unknown
): error is DiagramConflictError {
  return error instanceof DiagramConflictError;
}

async function loadDiagramPost(organizationId: string, postId: string) {
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.organizationId, organizationId)),
  });
  if (!post || post.contentType !== "image") {
    throw new Error("Diagram post not found");
  }
  const metadata = isRecord(post.sourceMetadata) ? post.sourceMetadata : {};
  return { post, metadata };
}

/** Renders a spec and stores it as the post's current image, scene, and spec. */
export async function saveDiagramRevision(params: {
  organizationId: string;
  postId: string;
  spec: DiagramSpec;
  edit: { kind: "ai" | "manual"; prompt?: string };
  title?: string;
  /** Revision the edit started from; a newer stored one aborts the save. */
  expectedRevision: number;
}) {
  const [{ metadata }, rendered] = await Promise.all([
    loadDiagramPost(params.organizationId, params.postId),
    renderDiagram(params.spec),
  ]);
  const revision = readDiagramRevision(metadata);
  if (revision !== params.expectedRevision) {
    throw new DiagramConflictError();
  }
  const [imageUrl, htmlUrl, excalidrawUrl] = await Promise.all([
    uploadGeneratedImageAsset({
      organizationId: params.organizationId,
      pngBase64: rendered.pngBase64,
      postId: params.postId,
    }),
    uploadGeneratedHtmlAsset({
      organizationId: params.organizationId,
      html: rendered.html,
      postId: params.postId,
    }),
    uploadGeneratedExcalidrawAsset({
      organizationId: params.organizationId,
      scene: rendered.scene,
      postId: params.postId,
    }),
  ]);

  const updated = await db
    .update(posts)
    .set({
      ...(params.title ? { title: params.title } : {}),
      content: imageUrl,
      htmlUrl,
      markdown: null,
      sourceMetadata: {
        ...metadata,
        format: "diagram",
        excalidrawUrl,
        diagramSpec: rendered.spec,
        diagramRevision: revision + 1,
        lastDiagramEdit: {
          kind: params.edit.kind,
          prompt: params.edit.prompt ?? null,
          at: new Date().toISOString(),
        },
      },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(posts.id, params.postId),
        eq(posts.organizationId, params.organizationId),
        // Compare-and-set: a save that landed while we rendered wins.
        sql`coalesce((${posts.sourceMetadata}->>'diagramRevision')::int, 0) = ${revision}`
      )
    )
    .returning({ id: posts.id });
  if (updated.length === 0) {
    throw new DiagramConflictError();
  }

  return { imageUrl, excalidrawUrl, revision: revision + 1 };
}

/**
 * Chat revision for diagrams: edit the spec with one model call and re-render.
 * Takes seconds instead of the minutes a sandbox restore needs.
 */
export async function reviseDiagramPost(params: {
  organizationId: string;
  postId: string;
  prompt: string;
  title?: string;
  useMarkup?: boolean;
  chargeAiCredits?: boolean;
}) {
  const { post, metadata } = await loadDiagramPost(
    params.organizationId,
    params.postId
  );
  const spec = readDiagramSpec(metadata);
  if (!spec) {
    throw new Error("This image has no editable diagram");
  }
  const startRevision = readDiagramRevision(metadata);

  const edited = await editDiagramSpecWithAi({
    spec,
    prompt: params.prompt,
    organizationId: params.organizationId,
  });
  const { imageUrl } = await saveDiagramRevision({
    organizationId: params.organizationId,
    postId: params.postId,
    spec: edited.spec,
    edit: { kind: "ai", prompt: params.prompt },
    title: params.title,
    expectedRevision: startRevision,
  });
  await trackImageGenerationUsage({
    organizationId: params.organizationId,
    postId: params.postId,
    usage: edited.usage,
    useMarkup: params.useMarkup,
    chargeAiCredits: params.chargeAiCredits,
  });

  return {
    postId: params.postId,
    title: params.title ?? post.title,
    imageUrl,
    status: "updated",
    contentType: "image",
    sandbox: null,
    usage: edited.usage,
  };
}
