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
import {
  ALL_POST_CONTENT_TYPES,
  ALL_POST_STATUSES,
} from "@notra/schemas/api/content";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import { nanoid } from "nanoid";

import {
  PostGenerationJobNotFoundError,
  PostGenerationQueueFailedError,
  PostInvalidMarkdownError,
  PostNotFoundError,
  PostSlugDuplicateError,
  PostSlugNotSupportedError,
  PostDatabaseError,
} from "../errors/posts";
import type {
  CommitPatchPostProgramInput,
  CreatePostGenerationProgramInput,
  CreatePostGenerationProgramSuccess,
  DeletePostProgramInput,
  DeletePostProgramSuccess,
  GetPostGenerationProgramInput,
  GetPostGenerationProgramSuccess,
  GetPostProgramInput,
  GetPostProgramSuccess,
  ListPostsProgramInput,
  ListPostsProgramSuccess,
  PatchPostProgramInput,
  PatchPostProgramSuccess,
  PreparePatchPostProgramSuccess,
} from "../types/posts";
import { addActiveGeneration } from "../utils/active-generations";
import {
  isConfirmedContentGenerationRejection,
  triggerContentGenerationWorkflow,
} from "../utils/content-generation";
import {
  extractTitleFromMarkdown,
  renderMarkdownToHtml,
} from "../utils/markdown";
import { isConstraintViolation, isPgUniqueViolation } from "../utils/pg-errors";
import { shouldApplyFilter, postQueryColumns } from "../utils/posts";

const database = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) => new PostDatabaseError({ cause }),
  });

function queueFailureMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to trigger workflow";
}

const patchPostLookupColumns = {
  id: true,
  title: true,
  slug: true,
  contentType: true,
  status: true,
} as const;

const failPostGenerationQueue = Effect.fnUntraced(function* (
  input: CreatePostGenerationProgramInput,
  collectionId: string,
  jobId: string,
  job: Awaited<ReturnType<typeof createContentGenerationJob>> | null,
  options: {
    deleteCollection: boolean;
    markJobFailed: boolean;
    errorMessage: string;
  }
) {
  if (options.deleteCollection) {
    yield* Effect.tryPromise({
      try: () =>
        input.db
          .delete(postCollections)
          .where(
            and(
              eq(postCollections.id, collectionId),
              eq(postCollections.organizationId, input.organizationId)
            )
          ),
      catch: () => undefined,
    }).pipe(Effect.ignore);
  }

  let failedJobId: string | undefined;

  if (options.markJobFailed && job) {
    failedJobId = yield* Effect.tryPromise({
      try: async () => {
        const failedJob = await setContentGenerationJobStatus(
          input.redis,
          jobId,
          "failed",
          {
            error: options.errorMessage,
          }
        );
        return failedJob?.id;
      },
      catch: () => undefined,
    }).pipe(Effect.catch(() => Effect.succeed(undefined)));

    yield* Effect.tryPromise({
      try: () =>
        appendContentGenerationJobEvent(input.redis, {
          id: crypto.randomUUID(),
          jobId,
          type: "failed",
          message: options.errorMessage,
          createdAt: new Date().toISOString(),
          metadata: null,
        }),
      catch: () => undefined,
    }).pipe(Effect.ignore);
  }

  return yield* new PostGenerationQueueFailedError({
    jobId: failedJobId,
  });
});

function recoverBeforeWorkflowAccepted(
  input: CreatePostGenerationProgramInput,
  collectionId: string,
  jobId: string,
  job: Awaited<ReturnType<typeof createContentGenerationJob>> | null
) {
  return Effect.catch((error: unknown) =>
    failPostGenerationQueue(input, collectionId, jobId, job, {
      deleteCollection: true,
      markJobFailed: job !== null,
      errorMessage: queueFailureMessage(error),
    })
  );
}

function recoverWorkflowTriggerFailure(
  input: CreatePostGenerationProgramInput,
  collectionId: string,
  jobId: string,
  job: Awaited<ReturnType<typeof createContentGenerationJob>>
) {
  return Effect.catch((error: unknown) =>
    failPostGenerationQueue(input, collectionId, jobId, job, {
      deleteCollection: isConfirmedContentGenerationRejection(error),
      markJobFailed: true,
      errorMessage: queueFailureMessage(error),
    })
  );
}

function recoverAfterWorkflowAccepted(
  input: CreatePostGenerationProgramInput,
  collectionId: string,
  jobId: string,
  job: Awaited<ReturnType<typeof createContentGenerationJob>>
) {
  return Effect.catch((error: unknown) =>
    failPostGenerationQueue(input, collectionId, jobId, job, {
      deleteCollection: false,
      markJobFailed: true,
      errorMessage: queueFailureMessage(error),
    })
  );
}

export const listPosts = Effect.fn("posts.list")(function* (
  input: ListPostsProgramInput
) {
  const { limit, page, sort, status, contentType, brandIdentityId } =
    input.query;
  const offset = (page - 1) * limit;
  const whereClause = and(
    eq(posts.organizationId, input.organizationId),
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

  const [[countResult], results] = yield* database(() =>
    Promise.all([
      input.db
        .select({ totalItems: count(posts.id) })
        .from(posts)
        .where(whereClause),
      input.db.query.posts.findMany({
        where: whereClause,
        orderBy: (table, { asc, desc }) =>
          sort === "asc"
            ? [asc(table.createdAt), asc(table.id)]
            : [desc(table.createdAt), desc(table.id)],
        limit,
        offset,
        columns: postQueryColumns(),
      }),
    ])
  );

  const totalItems = countResult?.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    posts: results,
    pagination: {
      limit,
      currentPage: page,
      nextPage: page < totalPages ? page + 1 : null,
      previousPage: page > 1 ? page - 1 : null,
      totalPages,
      totalItems,
    },
  } satisfies ListPostsProgramSuccess;
});

export const getPost = Effect.fn("posts.get")(function* (
  input: GetPostProgramInput
) {
  const post = yield* database(() =>
    input.db.query.posts.findFirst({
      where: and(
        eq(posts.id, input.postId),
        eq(posts.organizationId, input.organizationId)
      ),
      columns: postQueryColumns(),
    })
  );

  return {
    post: post ?? null,
  } satisfies GetPostProgramSuccess;
});

export const deletePost = Effect.fn("posts.delete")(function* (
  input: DeletePostProgramInput
) {
  const [deletedPost] = yield* database(() =>
    input.db
      .delete(posts)
      .where(
        and(
          eq(posts.id, input.postId),
          eq(posts.organizationId, input.organizationId)
        )
      )
      .returning({ id: posts.id })
  );

  if (!deletedPost) {
    return yield* new PostNotFoundError();
  }

  return {
    id: deletedPost.id,
  } satisfies DeletePostProgramSuccess;
});

export const preparePatchPost = Effect.fn("posts.preparePatch")(function* (
  input: PatchPostProgramInput
) {
  const existingPost = yield* database(() =>
    input.db.query.posts.findFirst({
      where: and(
        eq(posts.id, input.postId),
        eq(posts.organizationId, input.organizationId)
      ),
      columns: patchPostLookupColumns,
    })
  );

  if (!existingPost) {
    return yield* new PostNotFoundError();
  }

  const updateData: Partial<typeof posts.$inferInsert> = {
    updatedAt: new Date(),
  };
  const { body } = input;

  if (body.title !== undefined) {
    updateData.title = body.title;
  }

  if (body.slug !== undefined) {
    if (!supportsPostSlug(existingPost.contentType)) {
      return yield* new PostSlugNotSupportedError();
    }

    updateData.slug = body.slug;
  }

  if (body.markdown !== undefined) {
    const markdown = body.markdown;
    const renderedContent = yield* Effect.tryPromise({
      try: () => renderMarkdownToHtml(markdown),
      catch: () => new PostInvalidMarkdownError(),
    });

    updateData.markdown = markdown;
    updateData.content = renderedContent;

    if (body.title === undefined) {
      updateData.title =
        extractTitleFromMarkdown(markdown) ?? existingPost.title;
    }
  }

  if (body.status !== undefined) {
    updateData.status = body.status;
  }

  return {
    prepared: {
      updateData,
      previousStatus: existingPost.status,
    },
  } satisfies PreparePatchPostProgramSuccess;
});

export const commitPatchPost = Effect.fn("posts.commitPatch")(function* (
  input: CommitPatchPostProgramInput
) {
  const patchResult = yield* Effect.tryPromise({
    try: () =>
      input.db
        .update(posts)
        .set(input.prepared.updateData)
        .where(
          and(
            eq(posts.id, input.postId),
            eq(posts.organizationId, input.organizationId)
          )
        )
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
        }),
    catch: (cause) => {
      if (
        isPgUniqueViolation(cause) &&
        isConstraintViolation(cause, "posts_org_slug_uidx")
      ) {
        return new PostSlugDuplicateError();
      }

      return new PostDatabaseError({ cause });
    },
  });

  const [updatedPost] = patchResult;

  if (!updatedPost) {
    return yield* new PostNotFoundError();
  }

  return {
    post: updatedPost,
    previousStatus: input.prepared.previousStatus,
  } satisfies PatchPostProgramSuccess;
});

export const createPostGeneration = Effect.fn("posts.createGeneration")(
  function* (input: CreatePostGenerationProgramInput) {
    const now = new Date().toISOString();
    const jobId = createContentGenerationJobId();
    const collectionId = nanoid();
    const { body } = input;

    yield* database(() =>
      input.db.insert(postCollections).values({
        id: collectionId,
        organizationId: input.organizationId,
        source: "api",
        sourceId: jobId,
        name: buildPostCollectionName([body.contentType], new Date(now)),
        nameSource: "generated",
        contentTypes: [body.contentType],
        expectedPostCount: 1,
        completedPostCount: 0,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
    );

    const job = yield* Effect.tryPromise({
      try: () =>
        createContentGenerationJob(input.redis, {
          id: jobId,
          organizationId: input.organizationId,
          status: "queued",
          contentType: body.contentType,
          lookbackWindow: body.lookbackWindow,
          repositoryIds: input.repositoryIds ?? [],
          brandVoiceId: input.resolvedBrandVoiceId,
          workflowRunId: null,
          postId: null,
          error: null,
          source: "api",
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        }),
      catch: (cause) => cause,
    }).pipe(recoverBeforeWorkflowAccepted(input, collectionId, jobId, null));

    yield* Effect.tryPromise({
      try: () =>
        addActiveGeneration(input.redis, input.organizationId, {
          runId: jobId,
          triggerId: "api_on_demand",
          outputType: body.contentType,
          triggerName: body.contentType,
          startedAt: now,
          source: "api",
        }),
      catch: (cause) => cause,
    }).pipe(recoverBeforeWorkflowAccepted(input, collectionId, jobId, job));

    yield* Effect.tryPromise({
      try: () =>
        appendContentGenerationJobEvent(input.redis, {
          id: crypto.randomUUID(),
          jobId,
          type: "queued",
          message: `Queued ${body.contentType.replaceAll("_", " ")} generation`,
          createdAt: now,
          metadata: {
            lookbackWindow: body.lookbackWindow,
            repositoryCount: input.repositoryIds?.length ?? 0,
            linearIntegrationCount: input.linearIntegrationIds?.length ?? 0,
          },
        }),
      catch: (cause) => cause,
    }).pipe(recoverBeforeWorkflowAccepted(input, collectionId, jobId, job));

    const workflowRunId = yield* Effect.tryPromise({
      try: () =>
        triggerContentGenerationWorkflow(input.runtimeEnv, {
          organizationId: input.organizationId,
          collectionId,
          jobId,
          runId: jobId,
          contentType: body.contentType,
          lookbackWindow: body.lookbackWindow,
          repositoryIds: input.repositoryIds,
          linearIntegrationIds: input.linearIntegrationIds,
          brandVoiceId: input.resolvedBrandVoiceId ?? undefined,
          dataPoints: body.dataPoints,
          selectedItems: body.selectedItems,
          aiCreditReserved: false,
          aiCreditMarkup: false,
          source: "api",
        }),
      catch: (cause) => cause,
    }).pipe(recoverWorkflowTriggerFailure(input, collectionId, jobId, job));

    const updatedJob = yield* Effect.tryPromise({
      try: () =>
        updateContentGenerationJob(input.redis, jobId, {
          workflowRunId,
        }),
      catch: (cause) => cause,
    }).pipe(recoverAfterWorkflowAccepted(input, collectionId, jobId, job));

    yield* Effect.tryPromise({
      try: () =>
        appendContentGenerationJobEvent(input.redis, {
          id: crypto.randomUUID(),
          jobId,
          type: "workflow_triggered",
          message: "Triggered content generation workflow",
          createdAt: new Date().toISOString(),
          metadata: { workflowRunId },
        }),
      catch: (cause) => cause,
    }).pipe(recoverAfterWorkflowAccepted(input, collectionId, jobId, job));

    return {
      job: updatedJob ?? job,
    } satisfies CreatePostGenerationProgramSuccess;
  }
);

export const getPostGeneration = Effect.fn("posts.getGeneration")(function* (
  input: GetPostGenerationProgramInput
) {
  const job = yield* database(() =>
    getContentGenerationJob(input.redis, input.jobId)
  );

  if (!job || job.organizationId !== input.organizationId) {
    return yield* new PostGenerationJobNotFoundError();
  }

  const events = yield* database(() =>
    listContentGenerationJobEvents(input.redis, input.jobId)
  );

  return {
    job,
    events,
  } satisfies GetPostGenerationProgramSuccess;
});
