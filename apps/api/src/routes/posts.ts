import { createRoute } from "@hono/zod-openapi";
import { supportsPostSlug } from "@notra/ai/schemas/post";
import {
  appendContentGenerationJobEvent,
  createContentGenerationJob,
  createContentGenerationJobId,
  getContentGenerationJob,
  listContentGenerationJobEvents,
  setContentGenerationJobStatus,
  updateContentGenerationJob,
} from "@notra/content-generation/jobs";
import { postCollections, posts } from "@notra/db/schema";
import { buildPostCollectionName } from "@notra/db/utils/post-collections";
import { requestGeoRescanForPost } from "@notra/geo-core/geo/rescan";
import {
  ALL_POST_CONTENT_TYPES,
  ALL_POST_STATUSES,
  createPostGenerationRequestSchema,
  createPostGenerationResponseSchema,
  deletePostResponseSchema,
  generationQueueErrorResponseSchema,
  getPostGenerationParamsSchema,
  getPostGenerationResponseSchema,
  getPostParamsSchema,
  getPostResponseSchema,
  getPostsOpenApiQuerySchema,
  getPostsParamsSchema,
  getPostsResponseSchema,
  patchPostRequestSchema,
  patchPostResponseSchema,
} from "@notra/schemas/api/content";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { addActiveGeneration } from "../utils/active-generations";
import { getOrganizationId } from "../utils/auth";
import {
  getContentGenerationUnavailableReason,
  isContentGenerationConfigured,
  resolveRequestedBrandVoiceId,
  resolveRequestedLinearIntegrationIds,
  resolveRequestedRepositoryIds,
  triggerContentGenerationWorkflow,
} from "../utils/content-generation";
import { runGeoEffect } from "../utils/geo-effect";
import {
  extractTitleFromMarkdown,
  renderMarkdownToHtml,
} from "../utils/markdown";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse, rateLimitResponse } from "../utils/openapi-responses";
import { getOrganizationResponse } from "../utils/organizations";
import { isConstraintViolation, isPgUniqueViolation } from "../utils/pg-errors";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";
import { getRedis } from "../utils/redis";

export const postsRoutes = createOpenApiApp();

function shouldApplyFilter(
  selectedValues: readonly string[],
  allValues: readonly string[]
) {
  return selectedValues.length < allValues.length;
}

type PostResponseContentType = (typeof ALL_POST_CONTENT_TYPES)[number];

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

function serializePost(post: {
  content: string;
  contentType: string;
  createdAt: Date;
  id: string;
  htmlUrl?: string | null;
  markdown: string | null;
  rawHtml?: string | null;
  recommendations: string | null;
  slug: string | null;
  sourceMetadata: unknown;
  status: "draft" | "published";
  title: string;
  updatedAt: Date;
}) {
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

const getPostsRoute = createRoute({
  method: "get",
  path: "/posts",
  tags: ["Content"],
  operationId: "listPosts",
  summary: "List posts",
  description:
    "Returns posts for the organization the API key belongs to, newest first by default. Only published posts are included unless you pass status=draft,published.",
  request: {
    params: getPostsParamsSchema,
    query: getPostsOpenApiQuerySchema,
  },
  responses: {
    200: {
      description: "Posts fetched successfully",
      content: {
        "application/json": {
          schema: getPostsResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params or query"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Organization not found"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const getPostRoute = createRoute({
  method: "get",
  path: "/posts/{postId}",
  tags: ["Content"],
  operationId: "getPost",
  summary: "Get a single post",
  description:
    "Returns the post. When no post with this ID exists in your organization, the response is still 200 with post set to null.",
  request: {
    params: getPostParamsSchema,
  },
  responses: {
    200: {
      description: "Post fetched successfully",
      content: {
        "application/json": {
          schema: getPostResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Organization not found"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const deletePostRoute = createRoute({
  method: "delete",
  path: "/posts/{postId}",
  tags: ["Content"],
  operationId: "deletePost",
  summary: "Delete a single post",
  request: {
    params: getPostParamsSchema,
  },
  responses: {
    200: {
      description: "Post deleted successfully",
      content: {
        "application/json": {
          schema: deletePostResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Post not found"),
    503: errorResponse("Authentication service unavailable"),
  },
});

const patchPostRoute = createRoute({
  method: "patch",
  path: "/posts/{postId}",
  tags: ["Content"],
  operationId: "updatePost",
  summary: "Update a single post",
  description:
    "Updates any combination of title, slug, markdown, and status. Sending markdown re-renders the stored HTML, and when title is omitted it is taken from the first heading in the markdown, keeping the existing title when the markdown has no heading. Slugs are only accepted for blog posts and changelogs.",
  request: {
    params: getPostParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: patchPostRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Post updated successfully",
      content: {
        "application/json": {
          schema: patchPostResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params or request body"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Post not found"),
    409: errorResponse("Post slug already exists"),
    429: rateLimitResponse(
      RATE_LIMITS.postUpdate.requests,
      RATE_LIMITS.postUpdate.window,
      "API key"
    ),
    503: errorResponse("Authentication service unavailable"),
  },
});

const createPostGenerationRoute = createRoute({
  method: "post",
  path: "/posts/generate",
  tags: ["Content"],
  operationId: "createPostGeneration",
  summary: "Queue async post generation",
  description:
    "Queues a generation job for one content type and returns 202 with the job. Select sources with integrations.github, integrations.linear, or github.repositories; when no selector is given at all, every connected GitHub integration is used. Poll GET /v1/posts/generate/{jobId} until job.status is completed, failed, or skipped. Notra does not send webhooks when the job finishes.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createPostGenerationRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    202: {
      description: "Post generation queued successfully",
      content: {
        "application/json": {
          schema: createPostGenerationResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid request body"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Organization not found"),
    429: rateLimitResponse(
      RATE_LIMITS.postGeneration.requests,
      RATE_LIMITS.postGeneration.window,
      "API key"
    ),
    503: {
      description: "Content generation is unavailable",
      content: {
        "application/json": {
          schema: generationQueueErrorResponseSchema,
        },
      },
    },
  },
});

const getPostGenerationRoute = createRoute({
  method: "get",
  path: "/posts/generate/{jobId}",
  tags: ["Content"],
  operationId: "getPostGeneration",
  summary: "Get async post generation status",
  description:
    "Returns the job and its event log. job.status moves from queued to running and ends as completed, failed, or skipped. job.postId is set once the post has been created; fetch it with GET /v1/posts/{postId}.",
  request: {
    params: getPostGenerationParamsSchema,
  },
  responses: {
    200: {
      description: "Post generation status fetched successfully",
      content: {
        "application/json": {
          schema: getPostGenerationResponseSchema,
        },
      },
    },
    400: errorResponse("Invalid path params"),
    401: errorResponse("Missing or invalid API key"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Generation job not found"),
    503: errorResponse("Content generation is unavailable"),
  },
});

postsRoutes.openapi(getPostsRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const query = c.req.valid("query");
  const db = c.get("db");
  const { limit, page, sort, status, contentType, brandIdentityId } = query;
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const offset = (page - 1) * limit;
  const whereClause = and(
    eq(posts.organizationId, orgId),
    shouldApplyFilter(status, ALL_POST_STATUSES)
      ? inArray(posts.status, status)
      : undefined,
    shouldApplyFilter(contentType, ALL_POST_CONTENT_TYPES)
      ? inArray(posts.contentType, contentType)
      : undefined,
    brandIdentityId.length > 0
      ? inArray(
          sql<string>`${posts.sourceMetadata} ->> 'brandVoiceId'`,
          brandIdentityId
        )
      : undefined
  );

  const [[countResult], results] = await Promise.all([
    db
      .select({ totalItems: count(posts.id) })
      .from(posts)
      .where(whereClause),
    db.query.posts.findMany({
      where: whereClause,
      orderBy: (table, { asc, desc }) =>
        sort === "asc"
          ? [asc(table.createdAt), asc(table.id)]
          : [desc(table.createdAt), desc(table.id)],
      limit,
      offset,
      columns: {
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
      },
    }),
  ]);

  const totalItems = countResult?.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return c.json(
    {
      posts: results.map(serializePost),
      pagination: {
        limit,
        currentPage: page,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
        totalPages,
        totalItems,
      },
      organization,
    },
    200
  );
});

postsRoutes.openapi(getPostRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const params = c.req.valid("param");
  const db = c.get("db");
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, params.postId), eq(posts.organizationId, orgId)),
    columns: {
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
    },
  });

  return c.json(
    {
      post: post ? serializePost(post) : null,
      organization,
    },
    200
  );
});

postsRoutes.openapi(deletePostRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const { postId } = c.req.valid("param");
  const db = c.get("db");
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const [deletedPost] = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.organizationId, orgId)))
    .returning({ id: posts.id });

  if (!deletedPost) {
    return c.json({ error: "Post not found" }, 404);
  }

  return c.json({ id: deletedPost.id, organization }, 200);
});

postsRoutes.openapi(patchPostRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const { postId } = c.req.valid("param");
  const body = c.req.valid("json");
  const db = c.get("db");
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const existingPost = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.organizationId, orgId)),
    columns: {
      id: true,
      title: true,
      slug: true,
      contentType: true,
      status: true,
    },
  });

  if (!existingPost) {
    return c.json({ error: "Post not found" }, 404);
  }

  const updateData: Partial<typeof posts.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) {
    updateData.title = body.title;
  }

  if (body.slug !== undefined) {
    if (!supportsPostSlug(existingPost.contentType)) {
      return c.json(
        { error: "Slug can only be set for blog posts and changelogs" },
        400
      );
    }

    updateData.slug = body.slug;
  }

  if (body.markdown !== undefined) {
    let renderedContent: string;

    try {
      renderedContent = await renderMarkdownToHtml(body.markdown);
    } catch {
      return c.json({ error: "Invalid markdown content" }, 400);
    }

    updateData.markdown = body.markdown;
    updateData.content = renderedContent;

    if (body.title === undefined) {
      updateData.title =
        extractTitleFromMarkdown(body.markdown) ?? existingPost.title;
    }
  }

  if (body.status !== undefined) {
    updateData.status = body.status;
  }

  let updatedRows: Array<{
    id: string;
    title: string;
    slug: string | null;
    content: string;
    htmlUrl?: string | null;
    markdown: string | null;
    rawHtml?: string | null;
    recommendations: string | null;
    contentType: string;
    sourceMetadata: unknown;
    status: "draft" | "published";
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  // Charged immediately before the write: the 404s and 400s above must not
  // spend the caller's update budget.
  const rateLimited = await enforceRatelimit(c, ratelimit.postUpdate);
  if (rateLimited) {
    return rateLimited;
  }

  try {
    updatedRows = await db
      .update(posts)
      .set(updateData)
      .where(and(eq(posts.id, postId), eq(posts.organizationId, orgId)))
      .returning({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        content: posts.content,
        htmlUrl: posts.htmlUrl,
        markdown: posts.markdown,
        recommendations: posts.recommendations,
        contentType: posts.contentType,
        sourceMetadata: posts.sourceMetadata,
        status: posts.status,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      });
  } catch (error) {
    if (
      isPgUniqueViolation(error) &&
      isConstraintViolation(error, "posts_org_slug_uidx")
    ) {
      return c.json({ error: "A post with this slug already exists" }, 409);
    }

    throw error;
  }

  const [updatedPost] = updatedRows;

  if (!updatedPost) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (
    updatedPost.status === "published" &&
    existingPost.status !== "published"
  ) {
    void runGeoEffect(
      "rescanForPost",
      requestGeoRescanForPost({ organizationId: orgId, postId: updatedPost.id })
    );
  }

  return c.json({ post: serializePost(updatedPost), organization }, 200);
});

postsRoutes.openapi(createPostGenerationRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const runtimeEnv = c.env ?? {};
  const redis = getRedis(runtimeEnv);
  const unavailableReason = getContentGenerationUnavailableReason(runtimeEnv);
  if (
    !redis ||
    !isContentGenerationConfigured(runtimeEnv) ||
    unavailableReason
  ) {
    return c.json(
      { error: unavailableReason ?? "Content generation is unavailable" },
      503
    );
  }

  const body = c.req.valid("json");
  const db = c.get("db");
  const organization = await getOrganizationResponse(db, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  let repositoryIds: string[] | undefined;
  let linearIntegrationIds: string[] | undefined;
  let resolvedBrandVoiceId: string | null = null;
  const requestedIntegrations = {
    github: body.integrations?.github ?? body.repositoryIds,
    linear: body.integrations?.linear ?? body.linearIntegrationIds,
  };

  try {
    repositoryIds = await resolveRequestedRepositoryIds(db, orgId, {
      integrations: requestedIntegrations,
      github: body.github,
    });
    linearIntegrationIds = await resolveRequestedLinearIntegrationIds(
      db,
      orgId,
      {
        integrations: requestedIntegrations,
      }
    );
    resolvedBrandVoiceId = await resolveRequestedBrandVoiceId(
      db,
      orgId,
      body.brandIdentityId ?? body.brandVoiceId
    );
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to resolve requested repositories",
      },
      400
    );
  }

  // Charged immediately before the billable generation is queued: the 503, 404
  // and 400 responses above must not spend the caller's budget.
  const rateLimited = await enforceRatelimit(c, ratelimit.postGeneration);
  if (rateLimited) {
    return rateLimited;
  }

  const now = new Date().toISOString();
  const jobId = createContentGenerationJobId();
  const collectionId = nanoid();
  let collectionCreated = false;

  await db.insert(postCollections).values({
    id: collectionId,
    organizationId: orgId,
    source: "api",
    sourceId: jobId,
    name: buildPostCollectionName([body.contentType], new Date(now)),
    nameSource: "generated",
    contentTypes: [body.contentType],
    expectedPostCount: 1,
    completedPostCount: 0,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });
  collectionCreated = true;

  let job: Awaited<ReturnType<typeof createContentGenerationJob>> | null = null;
  let workflowTriggered = false;

  try {
    job = await createContentGenerationJob(redis, {
      id: jobId,
      organizationId: orgId,
      status: "queued",
      contentType: body.contentType,
      lookbackWindow: body.lookbackWindow,
      repositoryIds: repositoryIds ?? [],
      brandVoiceId: resolvedBrandVoiceId,
      workflowRunId: null,
      postId: null,
      error: null,
      source: "api",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });

    await addActiveGeneration(redis, orgId, {
      runId: jobId,
      triggerId: "api_on_demand",
      outputType: body.contentType,
      triggerName: body.contentType,
      startedAt: now,
      source: "api",
    });

    await appendContentGenerationJobEvent(redis, {
      id: crypto.randomUUID(),
      jobId,
      type: "queued",
      message: `Queued ${body.contentType.replaceAll("_", " ")} generation`,
      createdAt: now,
      metadata: {
        lookbackWindow: body.lookbackWindow,
        repositoryCount: repositoryIds?.length ?? 0,
        linearIntegrationCount: linearIntegrationIds?.length ?? 0,
      },
    });

    const workflowRunId = await triggerContentGenerationWorkflow(runtimeEnv, {
      organizationId: orgId,
      collectionId,
      jobId,
      runId: jobId,
      contentType: body.contentType,
      lookbackWindow: body.lookbackWindow,
      repositoryIds,
      linearIntegrationIds,
      brandVoiceId: resolvedBrandVoiceId ?? undefined,
      dataPoints: body.dataPoints,
      selectedItems: body.selectedItems,
      aiCreditReserved: false,
      aiCreditMarkup: false,
      source: "api",
    });
    workflowTriggered = true;

    const updatedJob = await updateContentGenerationJob(redis, jobId, {
      workflowRunId,
    });

    await appendContentGenerationJobEvent(redis, {
      id: crypto.randomUUID(),
      jobId,
      type: "workflow_triggered",
      message: "Triggered content generation workflow",
      createdAt: new Date().toISOString(),
      metadata: { workflowRunId },
    });

    return c.json({ job: updatedJob ?? job, organization }, 202);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to trigger workflow";

    if (collectionCreated && !workflowTriggered) {
      await db
        .delete(postCollections)
        .where(
          and(
            eq(postCollections.id, collectionId),
            eq(postCollections.organizationId, orgId)
          )
        )
        .catch(() => null);
    }

    const failedJob = job
      ? await setContentGenerationJobStatus(redis, jobId, "failed", {
          error: message,
        }).catch(() => null)
      : null;

    if (job) {
      await appendContentGenerationJobEvent(redis, {
        id: crypto.randomUUID(),
        jobId,
        type: "failed",
        message,
        createdAt: new Date().toISOString(),
        metadata: null,
      }).catch(() => null);
    }

    return c.json(
      {
        error: "Failed to queue content generation",
        ...(failedJob ? { jobId: failedJob.id } : {}),
      },
      503
    );
  }
});

postsRoutes.openapi(getPostGenerationRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const redis = getRedis(c.env ?? {});
  const unavailableReason = getContentGenerationUnavailableReason(c.env ?? {});
  if (!redis || unavailableReason) {
    return c.json(
      { error: unavailableReason ?? "Content generation is unavailable" },
      503
    );
  }

  const { jobId } = c.req.valid("param");
  const job = await getContentGenerationJob(redis, jobId);

  if (!job || job.organizationId !== orgId) {
    return c.json({ error: "Generation job not found" }, 404);
  }

  const events = await listContentGenerationJobEvents(redis, jobId);
  return c.json({ job, events }, 200);
});
