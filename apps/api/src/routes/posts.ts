import { createRoute } from "@hono/zod-openapi";
import { requestGeoRescanForPost } from "@notra/geo-core/geo/rescan";
import {
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

import {
  createPostGeneration,
  deletePost,
  getPost,
  getPostGeneration,
  listPosts,
  patchPost,
} from "../programs/posts";
import { runGeoEffect } from "../runtime/geo";
import type { DbClient } from "../types/db";
import { getOrganizationId } from "../utils/auth";
import {
  getContentGenerationUnavailableReason,
  isContentGenerationConfigured,
  resolveRequestedBrandVoiceId,
  resolveRequestedLinearIntegrationIds,
  resolveRequestedRepositoryIds,
} from "../utils/content-generation";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse, rateLimitResponse } from "../utils/openapi-responses";
import { getOrganizationResponse } from "../utils/organizations";
import {
  respondToPostFailure,
  runPostProgram,
  serializePost,
  validatePatchPostRequest,
} from "../utils/posts";
import { enforceRatelimit, RATE_LIMITS, ratelimit } from "../utils/ratelimit";
import { getRedis } from "../utils/redis";

export const postsRoutes = createOpenApiApp();

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

async function requireOrganization(
  c: {
    get: (key: "db") => DbClient;
  },
  orgId: string
) {
  const organization = await getOrganizationResponse(c.get("db"), orgId);
  return organization ?? null;
}

postsRoutes.openapi(getPostsRoute, async (c) => {
  const orgId = getOrganizationId(c);
  if (!orgId) {
    return c.json(
      { error: "Forbidden: API key must be scoped to an organization" },
      403
    );
  }

  const organization = await requireOrganization(c, orgId);
  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const result = await runPostProgram(
    listPosts({
      db: c.get("db"),
      organizationId: orgId,
      query: c.req.valid("query"),
    })
  );

  if (result._tag === "Failure") {
    throw result.failure;
  }

  return c.json(
    {
      posts: result.success.posts.map(serializePost),
      pagination: result.success.pagination,
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

  const organization = await requireOrganization(c, orgId);
  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const result = await runPostProgram(
    getPost({
      db: c.get("db"),
      organizationId: orgId,
      postId: c.req.valid("param").postId,
    })
  );

  if (result._tag === "Failure") {
    throw result.failure;
  }

  return c.json(
    {
      post: result.success.post ? serializePost(result.success.post) : null,
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

  const organization = await requireOrganization(c, orgId);
  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const result = await runPostProgram(
    deletePost({
      db: c.get("db"),
      organizationId: orgId,
      postId: c.req.valid("param").postId,
    })
  );

  if (result._tag === "Failure") {
    if (result.failure._tag === "PostNotFoundError") {
      return c.json({ error: "Post not found" }, 404);
    }
    throw result.failure;
  }

  return c.json({ id: result.success.id, organization }, 200);
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
  const organization = await requireOrganization(c, orgId);

  if (!organization) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const existingResult = await runPostProgram(
    getPost({
      db: c.get("db"),
      organizationId: orgId,
      postId,
    })
  );

  if (existingResult._tag === "Failure") {
    throw existingResult.failure;
  }

  if (!existingResult.success.post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const validationError = await validatePatchPostRequest(
    existingResult.success.post,
    body
  );

  if (validationError) {
    const response = respondToPostFailure(c, validationError);
    if (response) {
      return response;
    }
    throw validationError;
  }

  // Charged immediately before the write: the 404s and 400s above must not
  // spend the caller's update budget.
  const rateLimited = await enforceRatelimit(c, ratelimit.postUpdate);
  if (rateLimited) {
    return rateLimited;
  }

  const result = await runPostProgram(
    patchPost({
      db: c.get("db"),
      organizationId: orgId,
      postId,
      body,
    })
  );

  if (result._tag === "Failure") {
    const response = respondToPostFailure(c, result.failure);
    if (response) {
      return response;
    }
    throw result.failure;
  }

  const { post, previousStatus } = result.success;

  if (post.status === "published" && previousStatus !== "published") {
    void runGeoEffect(
      "rescanForPost",
      requestGeoRescanForPost({ organizationId: orgId, postId: post.id })
    );
  }

  return c.json({ post: serializePost(post), organization }, 200);
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
  const organization = await requireOrganization(c, orgId);

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
    repositoryIds = await resolveRequestedRepositoryIds(c.get("db"), orgId, {
      integrations: requestedIntegrations,
      github: body.github,
    });
    linearIntegrationIds = await resolveRequestedLinearIntegrationIds(
      c.get("db"),
      orgId,
      {
        integrations: requestedIntegrations,
      }
    );
    resolvedBrandVoiceId = await resolveRequestedBrandVoiceId(
      c.get("db"),
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

  const result = await runPostProgram(
    createPostGeneration({
      db: c.get("db"),
      organizationId: orgId,
      body,
      redis,
      runtimeEnv,
      repositoryIds,
      linearIntegrationIds,
      resolvedBrandVoiceId,
    })
  );

  if (result._tag === "Failure") {
    if (result.failure._tag === "PostGenerationQueueFailedError") {
      return c.json(
        {
          error: "Failed to queue content generation",
          ...(result.failure.jobId ? { jobId: result.failure.jobId } : {}),
        },
        503
      );
    }
    throw result.failure;
  }

  return c.json({ job: result.success.job, organization }, 202);
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

  const result = await runPostProgram(
    getPostGeneration({
      organizationId: orgId,
      jobId: c.req.valid("param").jobId,
      redis,
    })
  );

  if (result._tag === "Failure") {
    if (result.failure._tag === "PostGenerationJobNotFoundError") {
      return c.json({ error: "Generation job not found" }, 404);
    }
    throw result.failure;
  }

  return c.json(
    { job: result.success.job, events: result.success.events },
    200
  );
});
