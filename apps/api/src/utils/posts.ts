import { ALL_POST_CONTENT_TYPES } from "@notra/schemas/api/content";
import { Effect } from "effect";
import type { Context } from "hono";

import type { PostDatabaseError } from "../errors/posts";
import type { PostDomainError, PostRow } from "../types/posts";

type PostResponseContentType = (typeof ALL_POST_CONTENT_TYPES)[number];

export function shouldApplyFilter(
  selectedValues: readonly string[],
  allValues: readonly string[]
) {
  return selectedValues.length < allValues.length;
}

function extractImageArtifactHtml(sourceMetadata: unknown): string | null {
  if (
    !sourceMetadata ||
    typeof sourceMetadata !== "object" ||
    Array.isArray(sourceMetadata)
  ) {
    return null;
  }

  const artifacts = (sourceMetadata as { artifacts?: unknown }).artifacts;
  if (!artifacts || typeof artifacts !== "object" || Array.isArray(artifacts)) {
    return null;
  }

  const html = (artifacts as { html?: unknown }).html;
  return typeof html === "string" && html.trim() ? html : null;
}

export function serializePost(post: PostRow) {
  const isImage = post.contentType === "image";

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    htmlUrl: post.contentType === "image" ? (post.htmlUrl ?? null) : null,
    markdown: isImage ? null : post.markdown,
    rawHtml: isImage ? extractImageArtifactHtml(post.sourceMetadata) : null,
    recommendations: post.recommendations,
    contentType: post.contentType as PostResponseContentType,
    sourceMetadata: post.sourceMetadata,
    status: post.status,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export function postQueryColumns() {
  return {
    id: true,
    title: true,
    slug: true,
    content: true,
    htmlUrl: true,
    markdown: true,
    recommendations: true,
    contentType: true,
    sourceMetadata: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

/** Leave unexpected database errors to Hono's central error handler. */
export function runPostProgram<A, E extends PostDomainError>(
  program: Effect.Effect<A, E | PostDatabaseError>
) {
  return Effect.runPromise(
    Effect.result(
      program.pipe(
        Effect.catchTag("PostDatabaseError", (failure) =>
          Effect.die(failure.cause)
        )
      )
    )
  );
}

export function respondToPostFailure(c: Context, failure: PostDomainError) {
  if (failure._tag === "PostNotFoundError") {
    return c.json({ error: "Post not found" }, 404);
  }

  if (failure._tag === "PostSlugNotSupportedError") {
    return c.json(
      { error: "Slug can only be set for blog posts and changelogs" },
      400
    );
  }

  if (failure._tag === "PostInvalidMarkdownError") {
    return c.json({ error: "Invalid markdown content" }, 400);
  }

  if (failure._tag === "PostSlugDuplicateError") {
    return c.json({ error: "A post with this slug already exists" }, 409);
  }

  if (failure._tag === "PostGenerationJobNotFoundError") {
    return c.json({ error: "Generation job not found" }, 404);
  }

  if (failure._tag === "PostGenerationQueueFailedError") {
    return c.json(
      {
        error: "Failed to queue content generation",
        ...(failure.jobId ? { jobId: failure.jobId } : {}),
      },
      503
    );
  }
}
