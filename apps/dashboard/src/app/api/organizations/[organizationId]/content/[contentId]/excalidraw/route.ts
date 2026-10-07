import {
  canEditDiagramWithoutSandbox,
  readDiagramRevision,
  readExcalidrawUrl,
} from "@notra/ai/utils/diagram-metadata";
import {
  isDiagramConflictError,
  saveDiagramRevision,
} from "@notra/ai/utils/diagram-post";
import { sceneToDiagramSpec } from "@notra/ai/utils/diagram-scene-import";
import { describeDiagramSpecError } from "@notra/ai/utils/excalidraw-diagram";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import {
  DIAGRAM_REVISION_HEADER,
  MAX_DIAGRAM_SCENE_BYTES,
} from "@/constants/diagram-editor";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { saveDiagramSceneSchema } from "@/schemas/diagram-editor";
import type { RouteContext } from "@/types/api/routes";

const TRAILING_SLASHES_RE = /\/+$/;

// Serves the diagram's Excalidraw scene same-origin, so the clipboard export
// does not depend on the asset bucket's CORS rules.
export async function GET(
  request: Request,
  { params }: RouteContext<{ organizationId: string; contentId: string }>
) {
  const { organizationId, contentId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);
  if (!auth.success) {
    return auth.response;
  }

  const post = await db.query.posts.findFirst({
    columns: { sourceMetadata: true },
    where: and(
      eq(posts.id, contentId),
      eq(posts.organizationId, organizationId),
      eq(posts.contentType, "image")
    ),
  });
  const excalidrawUrl = readExcalidrawUrl(post?.sourceMetadata);
  const publicUrl = process.env.CLOUDFLARE_PUBLIC_URL?.replace(
    TRAILING_SLASHES_RE,
    ""
  );
  // Only fetch our own asset bucket, never an arbitrary URL from metadata.
  if (
    !(excalidrawUrl && publicUrl && excalidrawUrl.startsWith(`${publicUrl}/`))
  ) {
    return Response.json(
      { error: "This image has no Excalidraw scene" },
      { status: 404 }
    );
  }

  const response = await fetch(excalidrawUrl, { cache: "no-store" });
  if (!response.ok) {
    return Response.json(
      { error: "Failed to load the Excalidraw scene" },
      { status: 502 }
    );
  }

  return new Response(await response.text(), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      // The editor sends this back on save, so a save based on an older scene
      // cannot overwrite a newer chat or hand edit.
      [DIAGRAM_REVISION_HEADER]: String(
        readDiagramRevision(post?.sourceMetadata)
      ),
    },
  });
}

// Saves a diagram edited by hand in the embedded Excalidraw editor: the scene
// becomes the post's spec again, so chat edits continue from the hand edits.
export async function PUT(
  request: Request,
  { params }: RouteContext<{ organizationId: string; contentId: string }>
) {
  const { organizationId, contentId } = await params;
  const auth = await withOrganizationAuth(request, organizationId);
  if (!auth.success) {
    return auth.response;
  }

  const raw = await request.text();
  if (raw.length > MAX_DIAGRAM_SCENE_BYTES) {
    return Response.json({ error: "Diagram is too large" }, { status: 413 });
  }
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    // Reported as an invalid scene below.
  }
  const body = saveDiagramSceneSchema.safeParse(json);
  if (!body.success) {
    return Response.json({ error: "Invalid diagram scene" }, { status: 400 });
  }

  const post = await db.query.posts.findFirst({
    columns: { sourceMetadata: true },
    where: and(
      eq(posts.id, contentId),
      eq(posts.organizationId, organizationId),
      eq(posts.contentType, "image")
    ),
  });
  // Only diagrams: saving a scene over a marketing image would replace it.
  if (!(post && canEditDiagramWithoutSandbox(post.sourceMetadata))) {
    return Response.json({ error: "Diagram not found" }, { status: 404 });
  }

  let converted: ReturnType<typeof sceneToDiagramSpec>;
  try {
    converted = sceneToDiagramSpec(body.data.scene);
  } catch (error) {
    return Response.json(
      { error: describeDiagramSpecError(error) },
      { status: 422 }
    );
  }

  try {
    const { imageUrl, revision } = await saveDiagramRevision({
      organizationId,
      postId: contentId,
      spec: converted.spec,
      edit: { kind: "manual" },
      expectedRevision: body.data.revision,
    });
    return Response.json({
      imageUrl,
      revision,
      droppedTypes: converted.droppedTypes,
    });
  } catch (error) {
    if (isDiagramConflictError(error)) {
      return Response.json(
        { error: error.message, code: "conflict" },
        { status: 409 }
      );
    }
    throw error;
  }
}
