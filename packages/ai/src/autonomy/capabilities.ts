import { generateRepoImage } from "@notra/ai/agents/repo-image";
import {
  IrisCapabilityError,
  IrisCollectionError,
} from "@notra/ai/autonomy/errors";
import { IRIS_COLLECTION_NAME } from "@notra/ai/constants/autonomy";
import {
  IRIS_ANALYTICS_BEST_WEEKDAY_COUNT,
  IRIS_ANALYTICS_CONTENT_EXCERPT_LENGTH,
  IRIS_ANALYTICS_DEFAULT_DAYS,
  IRIS_ANALYTICS_DEFAULT_TOP_POSTS,
  IRIS_CAPABILITY_ANALYTICS_READ,
  IRIS_CAPABILITY_BLOG_POST_CREATE,
  IRIS_CAPABILITY_CHANGELOG_CREATE,
  IRIS_CAPABILITY_EXPERIMENT_CREATE,
  IRIS_CAPABILITY_EXPERIMENT_READ,
  IRIS_CAPABILITY_SOCIAL_POST_CREATE,
  IRIS_CAPABILITY_SOURCE_GITHUB_READ,
  IRIS_EXPERIMENT_DEFAULT_READ_LIMIT,
  IRIS_EXPERIMENT_RUNNING_STATUS,
  IRIS_IMAGE_ARTICLE_CONTEXT_MAX_LENGTH,
  IRIS_IMAGE_DEFAULT_BRANCH,
  IRIS_IMAGE_PROMPT_MAX_LENGTH,
  IRIS_IMAGE_QC_MAX_REVISION_ROUNDS,
  IRIS_MAX_BLOG_POST_IMAGES,
  IRIS_MIN_IMAGES_PER_POST,
} from "@notra/ai/constants/autonomy-capabilities";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import {
  IMAGE_GEN_MODEL_ID,
  IMAGE_REVIEW_MODEL_ID,
} from "@notra/ai/constants/repo-image";
import { gateway } from "@notra/ai/gateway";
import { getGitHubIntegrationsByOrganization } from "@notra/ai/integrations/github";
import {
  buildIrisBlogPostPrompt,
  buildIrisChangelogPrompt,
  buildIrisContentSystemPrompt,
  buildIrisImageAltText,
  buildIrisImageGenerationPrompt,
  buildIrisImageReviewPrompt,
  buildIrisSocialPostPrompt,
} from "@notra/ai/prompts/iris-content";
import { withRouterDefaults } from "@notra/ai/provider-options";
import {
  type IrisSocialPlatform,
  irisAnalyticsReadTaskParamsSchema,
  irisBlogPostTaskParamsSchema,
  irisContentTaskParamsSchema,
  irisExperimentCreateTaskParamsSchema,
  irisExperimentReadTaskParamsSchema,
  irisImageReviewSchema,
  irisSignalEnvelopeSchema,
  irisSignalRepositoryRefSchema,
  irisSocialPostTaskParamsSchema,
  irisSourceReadTaskParamsSchema,
} from "@notra/ai/schemas/autonomy/capability-params";
import type { ContentType } from "@notra/ai/schemas/content";
import type {
  EnsureIrisCollectionResult,
  ExecuteIrisTaskInput,
  IrisArtifact,
  IrisGeneratedText,
  IrisImageMarker,
  IrisImageOutcome,
  IrisImageResolution,
  IrisRepositoryTarget,
  IrisTaskExecutionResult,
} from "@notra/ai/types/autonomy-capabilities";
import { computeNamespacedId } from "@notra/ai/utils/autonomy-hash";
import { saveGeneratedImagePost } from "@notra/ai/utils/image-post-service";
import {
  applyIrisImageResolutions,
  buildIrisImageMarkdown,
  parseIrisImageMarkers,
} from "@notra/ai/utils/iris-image-markers";
import {
  buildMarkdownExcerpt,
  extractFirstMarkdownImageUrl,
  extractMarkdownTitle,
} from "@notra/ai/utils/iris-markdown";
import {
  irisSandboxCostCents,
  irisTextCostCents,
} from "@notra/ai/utils/iris-usage";
import { createPostRecord } from "@notra/ai/utils/post-service";
import {
  isTinybirdConfigured,
  queryPostingPerformance,
  queryPostMetricsLookup,
  querySocialOverview,
  queryTopPosts,
} from "@notra/analytics/tinybird/client";
import { db } from "@notra/db/drizzle";
import { postCollections, posts, socialExperiments } from "@notra/db/schema";
import { generateText, Output } from "ai";
import { and, desc, eq, or } from "drizzle-orm";
import { Effect } from "effect";

const IRIS_ID_LENGTH = 24;
const CHANGELOG_MAX_OUTPUT_TOKENS = 3000;
const BLOG_POST_MAX_OUTPUT_TOKENS = 4000;
const SOCIAL_POST_MAX_OUTPUT_TOKENS = 800;
const IMAGE_REVIEW_MAX_OUTPUT_TOKENS = 700;
const CONTENT_TEMPERATURE = 0.6;
const ISO_DATE_LENGTH = 10;

export const IRIS_CONTENT_MODEL_ID = AGENT_DEFAULT_MODEL;

const SOCIAL_CONTENT_TYPES: Record<IrisSocialPlatform, ContentType> = {
  twitter: "twitter_post",
  linkedin: "linkedin_post",
};

const buildParamsError = (
  input: ExecuteIrisTaskInput,
  cause: unknown
): IrisCapabilityError =>
  new IrisCapabilityError({
    message: `Task params do not match the contract of ${input.task.capabilityName}`,
    capabilityName: input.task.capabilityName,
    taskId: input.task.id,
    retryable: false,
    cause,
  });

export const ensureIrisCollection = Effect.fn(
  "iris.capabilities.ensureCollection"
)(function* (organizationId: string, runId: string) {
  const collectionId = computeNamespacedId(
    "iris-collection",
    [organizationId, runId],
    IRIS_ID_LENGTH
  );
  const now = new Date();

  yield* Effect.tryPromise({
    try: () =>
      db
        .insert(postCollections)
        .values({
          id: collectionId,
          organizationId,
          source: "automation",
          sourceId: runId,
          name: `${IRIS_COLLECTION_NAME}: ${now.toISOString().slice(0, ISO_DATE_LENGTH)} run`,
          nameSource: "generated",
          contentTypes: [],
          expectedPostCount: null,
          completedPostCount: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: postCollections.id }),
    catch: (cause) =>
      new IrisCollectionError({
        message: "Failed to create the Iris post collection",
        cause,
      }),
  });

  yield* Effect.annotateLogs(Effect.logDebug("iris.collection.ready"), {
    organizationId,
    runId,
    collectionId,
  });

  return { collectionId } satisfies EnsureIrisCollectionResult;
});

const describePrimarySignal = (primarySignal: unknown) => {
  const parsed = irisSignalEnvelopeSchema.safeParse(primarySignal);
  if (!parsed.success) {
    return {
      signalId: null,
      source: null,
      kind: null,
      sourceEventId: null,
      occurredAt: null,
    };
  }

  const occurredAt = parsed.data.occurredAt;
  return {
    signalId: parsed.data.id ?? null,
    source: parsed.data.source ?? null,
    kind: parsed.data.kind ?? null,
    sourceEventId: parsed.data.sourceEventId ?? null,
    occurredAt:
      occurredAt instanceof Date
        ? occurredAt.toISOString()
        : (occurredAt ?? null),
  };
};

const generateIrisText = Effect.fn("iris.capabilities.generateText")(
  function* (params: {
    input: ExecuteIrisTaskInput;
    prompt: string;
    maxOutputTokens: number;
  }) {
    const generated = yield* Effect.tryPromise({
      try: () =>
        generateText({
          model: gateway(IRIS_CONTENT_MODEL_ID, {
            organizationId: params.input.organizationId,
          }),
          system: buildIrisContentSystemPrompt({
            objective: params.input.mandate.objective,
          }),
          prompt: params.prompt,
          temperature: CONTENT_TEMPERATURE,
          maxOutputTokens: params.maxOutputTokens,
          providerOptions: withRouterDefaults(undefined, {
            modelId: IRIS_CONTENT_MODEL_ID,
          }),
        }),
      catch: (cause) =>
        new IrisCapabilityError({
          message: "Content generation failed",
          capabilityName: params.input.task.capabilityName,
          taskId: params.input.task.id,
          retryable: true,
          cause,
        }),
    });

    const text = generated.text.trim();
    if (text.length === 0) {
      return yield* Effect.fail(
        new IrisCapabilityError({
          message: "Content generation returned an empty draft",
          capabilityName: params.input.task.capabilityName,
          taskId: params.input.task.id,
          retryable: true,
          cause: null,
        })
      );
    }

    return {
      text,
      costCents: irisTextCostCents(generated.usage, IRIS_CONTENT_MODEL_ID),
    } satisfies IrisGeneratedText;
  }
);

const deriveIrisPostId = (input: ExecuteIrisTaskInput): string =>
  computeNamespacedId(
    "iris-post",
    [input.runId, input.task.id],
    IRIS_ID_LENGTH
  );

const loadExistingIrisArtifact = Effect.fn(
  "iris.capabilities.loadExistingArtifact"
)(function* (input: ExecuteIrisTaskInput) {
  const postId = deriveIrisPostId(input);

  const rows = yield* Effect.tryPromise({
    try: () =>
      db
        .select({
          id: posts.id,
          title: posts.title,
          markdown: posts.markdown,
          contentType: posts.contentType,
          status: posts.status,
        })
        .from(posts)
        .where(
          and(
            eq(posts.id, postId),
            eq(posts.organizationId, input.organizationId)
          )
        )
        .limit(1),
    catch: (cause) =>
      new IrisCapabilityError({
        message: "Failed to check for an already generated draft",
        capabilityName: input.task.capabilityName,
        taskId: input.task.id,
        retryable: true,
        cause,
      }),
  });

  const existing = rows.at(0);
  if (!existing) {
    return null;
  }

  const markdown = existing.markdown ?? "";
  const imageUrl = extractFirstMarkdownImageUrl(markdown);

  yield* Effect.annotateLogs(Effect.logInfo("iris.capability.reusedExisting"), {
    runId: input.runId,
    taskId: input.task.id,
    capability: input.task.capabilityName,
    postId: existing.id,
  });

  return {
    postId: existing.id,
    title: existing.title,
    contentType: existing.contentType,
    excerpt: buildMarkdownExcerpt(markdown),
    status: existing.status === "published" ? "published" : "draft",
    ...(imageUrl ? { imageUrl } : {}),
  } satisfies IrisArtifact;
});

const persistIrisPost = Effect.fn("iris.capabilities.persistPost")(
  function* (params: {
    input: ExecuteIrisTaskInput;
    contentType: ContentType;
    title: string;
    markdown: string;
    imageUrl?: string;
  }) {
    const { input } = params;
    const postId = deriveIrisPostId(input);

    const created = yield* Effect.tryPromise({
      try: () =>
        createPostRecord({
          organizationId: input.organizationId,
          collectionId: input.collectionId,
          contentType: params.contentType,
          title: params.title,
          markdown: params.markdown,
          autoPublish: input.mandate.policy.autoPublish,
          postId,
          sourceMetadata: {
            triggerId: input.runId,
            triggerSourceType: "iris",
            eventType: input.task.capabilityName,
            eventAction: input.task.id,
          },
        }),
      catch: (cause) =>
        new IrisCapabilityError({
          message: "Failed to save the generated content",
          capabilityName: input.task.capabilityName,
          taskId: input.task.id,
          retryable: true,
          cause,
        }),
    });

    const artifact: IrisArtifact = {
      postId: created.postId,
      title: params.title,
      contentType: params.contentType,
      excerpt: buildMarkdownExcerpt(params.markdown),
      status: input.mandate.policy.autoPublish ? "published" : "draft",
      ...(params.imageUrl ? { imageUrl: params.imageUrl } : {}),
    };

    yield* Effect.annotateLogs(Effect.logInfo("iris.capability.persisted"), {
      runId: input.runId,
      taskId: input.task.id,
      capability: input.task.capabilityName,
      postId: created.postId,
      deduplicated: created.deduplicated,
    });

    return artifact;
  }
);

const resolveIrisRepository = Effect.fn("iris.capabilities.resolveRepository")(
  function* (input: ExecuteIrisTaskInput) {
    const integrations = yield* Effect.tryPromise({
      try: () => getGitHubIntegrationsByOrganization(input.organizationId),
      catch: (cause) =>
        new IrisCapabilityError({
          message: "Failed to load the GitHub integrations",
          capabilityName: input.task.capabilityName,
          taskId: input.task.id,
          retryable: true,
          cause,
        }),
    });

    const signalEnvelope = irisSignalEnvelopeSchema.safeParse(
      input.signalContext.primarySignal
    );
    const signalRepository = irisSignalRepositoryRefSchema.safeParse(
      signalEnvelope.success && signalEnvelope.data.payload !== undefined
        ? signalEnvelope.data.payload
        : input.signalContext.primarySignal
    );
    const rootRepository = irisSignalRepositoryRefSchema.safeParse(
      input.signalContext.primarySignal
    );
    const signalRepositoryId =
      (signalRepository.success
        ? (signalRepository.data.repositoryId ?? null)
        : null) ??
      (rootRepository.success
        ? (rootRepository.data.repositoryId ?? null)
        : null);

    const candidates: IrisRepositoryTarget[] = [];
    for (const integration of integrations) {
      const repository = integration.repositories.at(0);
      if (
        !(integration.enabled && repository?.enabled) ||
        repository.owner.length === 0 ||
        repository.repo.length === 0
      ) {
        continue;
      }

      candidates.push({
        integrationId: integration.id,
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.defaultBranch ?? IRIS_IMAGE_DEFAULT_BRANCH,
      });
    }

    if (signalRepositoryId !== null) {
      const matched = candidates.find(
        (candidate) => candidate.integrationId === signalRepositoryId
      );
      if (matched) {
        return matched;
      }
    }

    if (candidates.length > 1) {
      yield* Effect.annotateLogs(
        Effect.logWarning("iris.capabilities.ambiguousRepository"),
        {
          organizationId: input.organizationId,
          taskId: input.task.id,
          candidateCount: candidates.length,
        }
      );
      return null;
    }

    return candidates.at(0) ?? null;
  }
);

const reviewIrisImage = Effect.fn("iris.capabilities.reviewImage")(
  function* (params: {
    pngBase64: string;
    description: string;
    articleTitle: string;
    organizationId: string;
  }) {
    const reviewed = yield* Effect.tryPromise({
      try: () =>
        generateText({
          model: gateway(IMAGE_REVIEW_MODEL_ID, {
            organizationId: params.organizationId,
          }),
          output: Output.object({ schema: irisImageReviewSchema }),
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: buildIrisImageReviewPrompt({
                    description: params.description,
                    articleTitle: params.articleTitle,
                  }),
                },
                {
                  type: "image",
                  image: params.pngBase64,
                  mediaType: "image/png",
                },
              ],
            },
          ],
          maxOutputTokens: IMAGE_REVIEW_MAX_OUTPUT_TOKENS,
          providerOptions: withRouterDefaults(undefined, {
            modelId: IMAGE_REVIEW_MODEL_ID,
          }),
        }),
      catch: (cause) => cause,
    });

    return {
      review: reviewed.output,
      costCents: irisTextCostCents(reviewed.usage, IMAGE_REVIEW_MODEL_ID),
    };
  }
);

const runRepoImageGeneration = Effect.fn("iris.capabilities.generateImage")(
  function* (params: {
    input: ExecuteIrisTaskInput;
    repository: IrisRepositoryTarget;
    prompt: string;
    restoreSnapshotId?: string;
  }) {
    return yield* Effect.tryPromise({
      try: () =>
        generateRepoImage({
          input: {
            organizationId: params.input.organizationId,
            integrationId: params.repository.integrationId,
            branch: params.repository.branch,
            mode: "prompt",
            prompt: params.prompt,
          },
          restoreSnapshotId: params.restoreSnapshotId,
          snapshotName: `iris-${params.input.runId}-${Date.now()}`,
          userId: null,
        }),
      catch: (cause) => cause,
    });
  }
);

const generateIrisIllustration = Effect.fn("iris.capabilities.illustration")(
  function* (params: {
    input: ExecuteIrisTaskInput;
    repository: IrisRepositoryTarget;
    marker: IrisImageMarker;
    articleTitle: string;
    articleContext: string;
  }) {
    const { marker } = params;
    const basePrompt = buildIrisImageGenerationPrompt({
      description: marker.description,
      articleContext: params.articleContext,
      maxLength: IRIS_IMAGE_PROMPT_MAX_LENGTH,
    });

    let costCents = 0;
    const firstAttempt = yield* Effect.result(
      runRepoImageGeneration({
        input: params.input,
        repository: params.repository,
        prompt: basePrompt,
      })
    );

    if (firstAttempt._tag === "Failure") {
      yield* Effect.annotateLogs(
        Effect.logWarning("iris.image.generationFailed"),
        {
          runId: params.input.runId,
          taskId: params.input.task.id,
          markerIndex: marker.index,
        }
      );
      return {
        verdict: {
          markerIndex: marker.index,
          description: marker.description,
          accept: false,
          reason: "Image generation failed",
          revisionRounds: 0,
          postId: null,
          imageUrl: null,
        },
        image: null,
        costCents,
      } satisfies IrisImageOutcome;
    }

    let current = firstAttempt.success;
    costCents += irisSandboxCostCents(current.usage, IMAGE_GEN_MODEL_ID);

    let reviewOutcome = yield* Effect.result(
      reviewIrisImage({
        pngBase64: current.pngBase64,
        description: marker.description,
        articleTitle: params.articleTitle,
        organizationId: params.input.organizationId,
      })
    );
    let accept = false;
    let reason = "Quality check could not run, image was rejected";
    let revisionRounds = 0;

    if (reviewOutcome._tag === "Success") {
      costCents += reviewOutcome.success.costCents;
      accept = reviewOutcome.success.review.accept;
      reason = reviewOutcome.success.review.reason;

      while (!accept && revisionRounds < IRIS_IMAGE_QC_MAX_REVISION_ROUNDS) {
        const revisionPrompt =
          reviewOutcome._tag === "Success"
            ? (reviewOutcome.success.review.revisionPrompt ?? basePrompt)
            : basePrompt;
        const snapshotId = current.sandbox?.snapshotId;
        if (!snapshotId) {
          break;
        }

        const revised = yield* Effect.result(
          runRepoImageGeneration({
            input: params.input,
            repository: params.repository,
            prompt: revisionPrompt.slice(0, IRIS_IMAGE_PROMPT_MAX_LENGTH),
            restoreSnapshotId: snapshotId,
          })
        );
        revisionRounds += 1;

        if (revised._tag === "Failure") {
          break;
        }

        current = revised.success;
        costCents += irisSandboxCostCents(current.usage, IMAGE_GEN_MODEL_ID);

        reviewOutcome = yield* Effect.result(
          reviewIrisImage({
            pngBase64: current.pngBase64,
            description: marker.description,
            articleTitle: params.articleTitle,
            organizationId: params.input.organizationId,
          })
        );

        if (reviewOutcome._tag === "Success") {
          costCents += reviewOutcome.success.costCents;
          accept = reviewOutcome.success.review.accept;
          reason = reviewOutcome.success.review.reason;
        } else {
          accept = false;
          reason = "Quality check could not run, image was rejected";
        }
      }
    }

    if (!accept) {
      yield* Effect.annotateLogs(Effect.logInfo("iris.image.rejected"), {
        runId: params.input.runId,
        taskId: params.input.task.id,
        markerIndex: marker.index,
        reason,
        revisionRounds,
      });
      return {
        verdict: {
          markerIndex: marker.index,
          description: marker.description,
          accept: false,
          reason,
          revisionRounds,
          postId: null,
          imageUrl: null,
        },
        image: null,
        costCents,
      } satisfies IrisImageOutcome;
    }

    const imagePostId = computeNamespacedId(
      "iris-image-post",
      [params.input.runId, params.input.task.id, String(marker.index)],
      IRIS_ID_LENGTH
    );

    const saved = yield* Effect.result(
      Effect.tryPromise({
        try: () =>
          saveGeneratedImagePost({
            organizationId: params.input.organizationId,
            collectionId: params.input.collectionId,
            postId: imagePostId,
            title: marker.description,
            pngBase64: current.pngBase64,
            html: current.html,
            sourceMetadata: {
              type: "iris_blog_image",
              runId: params.input.runId,
              parentTaskId: params.input.task.id,
              capabilityName: params.input.task.capabilityName,
              markerIndex: marker.index,
              prompt: basePrompt,
              integrationId: params.repository.integrationId,
              branch: params.repository.branch,
              brandIdentityId: current.brandIdentityId ?? null,
              sandbox: current.sandbox,
              usage: current.usage ?? null,
            },
          }),
        catch: (cause) => cause,
      })
    );

    if (saved._tag === "Failure") {
      return {
        verdict: {
          markerIndex: marker.index,
          description: marker.description,
          accept: false,
          reason: "Image could not be saved",
          revisionRounds,
          postId: null,
          imageUrl: null,
        },
        image: null,
        costCents,
      } satisfies IrisImageOutcome;
    }

    yield* Effect.annotateLogs(Effect.logInfo("iris.image.accepted"), {
      runId: params.input.runId,
      taskId: params.input.task.id,
      markerIndex: marker.index,
      postId: saved.success.postId,
      revisionRounds,
    });

    return {
      verdict: {
        markerIndex: marker.index,
        description: marker.description,
        accept: true,
        reason,
        revisionRounds,
        postId: saved.success.postId,
        imageUrl: saved.success.imageUrl,
      },
      image: {
        postId: saved.success.postId,
        imageUrl: saved.success.imageUrl,
        altText: buildIrisImageAltText(marker.description),
      },
      costCents,
    } satisfies IrisImageOutcome;
  }
);

const executeSourceGithubRead = Effect.fn("iris.capabilities.githubRead")(
  function* (input: ExecuteIrisTaskInput) {
    const parsed = irisSourceReadTaskParamsSchema.safeParse(input.task.params);
    if (!parsed.success) {
      return yield* Effect.fail(buildParamsError(input, parsed.error));
    }

    const primary = describePrimarySignal(input.signalContext.primarySignal);

    yield* Effect.annotateLogs(Effect.logInfo("iris.capability.githubRead"), {
      runId: input.runId,
      taskId: input.task.id,
      capability: input.task.capabilityName,
      signalCount: input.signalContext.summaries.length,
    });

    return {
      artifacts: [],
      costCents: 0,
      externalRef: {
        kind: "github_context",
        focus: parsed.data.focus ?? null,
        primarySignal: primary,
        signalCount: input.signalContext.summaries.length,
        summaries: input.signalContext.summaries,
      },
    } satisfies IrisTaskExecutionResult;
  }
);

const executeAnalyticsRead = Effect.fn("iris.capabilities.analyticsRead")(
  function* (input: ExecuteIrisTaskInput) {
    const parsed = irisAnalyticsReadTaskParamsSchema.safeParse(
      input.task.params
    );
    if (!parsed.success) {
      return yield* Effect.fail(buildParamsError(input, parsed.error));
    }

    const days = parsed.data.days ?? IRIS_ANALYTICS_DEFAULT_DAYS;
    const topPostsLimit =
      parsed.data.topPostsLimit ?? IRIS_ANALYTICS_DEFAULT_TOP_POSTS;

    yield* Effect.annotateLogs(
      Effect.logInfo("iris.capability.analyticsRead"),
      {
        runId: input.runId,
        taskId: input.task.id,
        capability: input.task.capabilityName,
        days,
        topPostsLimit,
      }
    );

    if (!isTinybirdConfigured()) {
      return {
        artifacts: [],
        costCents: 0,
        externalRef: { kind: "social_analytics", configured: false },
      } satisfies IrisTaskExecutionResult;
    }

    const analytics = yield* Effect.tryPromise({
      try: () =>
        Promise.all([
          querySocialOverview({ organization_id: input.organizationId }),
          queryTopPosts({
            organization_id: input.organizationId,
            limit: topPostsLimit,
          }),
          queryPostingPerformance({
            organization_id: input.organizationId,
            days,
          }),
        ]),
      catch: (cause) =>
        new IrisCapabilityError({
          message: "Failed to read social analytics",
          capabilityName: input.task.capabilityName,
          taskId: input.task.id,
          retryable: true,
          cause,
        }),
    });

    const [overview, top, performance] = analytics;

    if (!(overview && top && performance)) {
      return {
        artifacts: [],
        costCents: 0,
        externalRef: { kind: "social_analytics", configured: false },
      } satisfies IrisTaskExecutionResult;
    }

    const accounts = overview.data.map((row) => ({
      provider: row.provider,
      username: row.username,
      followers: row.followers_count,
      trackedPosts: row.tracked_posts,
      impressions: row.impressions,
      likes: row.likes,
      replies: row.replies,
      reposts: row.reposts,
    }));

    const topPostSummaries = top.data.map((row) => ({
      content: row.content.slice(0, IRIS_ANALYTICS_CONTENT_EXCERPT_LENGTH),
      url: row.url,
      engagement: row.engagement,
    }));

    // react-doctor-disable-next-line js-tosorted-immutable -- tsconfig lib predates ES2023
    const bestWeekdays = [...performance.data]
      .sort((left, right) => right.avg_engagement - left.avg_engagement)
      .slice(0, IRIS_ANALYTICS_BEST_WEEKDAY_COUNT)
      .map((row) => ({
        weekday: row.weekday,
        posts: row.posts,
        avgEngagement: row.avg_engagement,
      }));

    return {
      artifacts: [],
      costCents: 0,
      externalRef: {
        kind: "social_analytics",
        configured: true,
        days,
        accounts,
        topPosts: topPostSummaries,
        bestWeekdays,
      },
    } satisfies IrisTaskExecutionResult;
  }
);

const toMetricNumber = (value: number | bigint | null): number =>
  value === null ? 0 : Number(value);

const computeExperimentMetricValue = (
  metric: string,
  entry: {
    impressions: number | bigint | null;
    likes: number | bigint | null;
    replies: number | bigint | null;
    reposts: number | bigint | null;
  } | null
): number => {
  if (!entry) {
    return 0;
  }
  if (metric === "impressions") {
    return toMetricNumber(entry.impressions);
  }
  if (metric === "likes") {
    return toMetricNumber(entry.likes);
  }
  return (
    toMetricNumber(entry.likes) +
    toMetricNumber(entry.replies) +
    toMetricNumber(entry.reposts)
  );
};

const deriveIrisExperimentId = (input: ExecuteIrisTaskInput): string =>
  computeNamespacedId(
    "iris-experiment",
    [input.runId, input.task.id],
    IRIS_ID_LENGTH
  );

const executeExperimentCreate = Effect.fn("iris.capabilities.experimentCreate")(
  function* (input: ExecuteIrisTaskInput) {
    const parsed = irisExperimentCreateTaskParamsSchema.safeParse(
      input.task.params
    );
    if (!parsed.success) {
      return yield* Effect.fail(buildParamsError(input, parsed.error));
    }

    const { name, hypothesis, variantAPostId, variantBPostId, metric } =
      parsed.data;

    if (variantAPostId === variantBPostId) {
      return yield* Effect.fail(
        new IrisCapabilityError({
          message: "An A/B test needs two different posts to compare",
          capabilityName: input.task.capabilityName,
          taskId: input.task.id,
          retryable: false,
          cause: null,
        })
      );
    }

    const experimentId = deriveIrisExperimentId(input);

    const existingRows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: socialExperiments.id,
            name: socialExperiments.name,
            metric: socialExperiments.metric,
          })
          .from(socialExperiments)
          .where(
            and(
              eq(socialExperiments.organizationId, input.organizationId),
              or(
                eq(socialExperiments.id, experimentId),
                and(
                  eq(socialExperiments.status, IRIS_EXPERIMENT_RUNNING_STATUS),
                  or(
                    and(
                      eq(socialExperiments.variantAPostId, variantAPostId),
                      eq(socialExperiments.variantBPostId, variantBPostId)
                    ),
                    and(
                      eq(socialExperiments.variantAPostId, variantBPostId),
                      eq(socialExperiments.variantBPostId, variantAPostId)
                    )
                  )
                )
              )
            )
          )
          .limit(1),
      catch: (cause) =>
        new IrisCapabilityError({
          message: "Failed to check for an already running A/B test",
          capabilityName: input.task.capabilityName,
          taskId: input.task.id,
          retryable: true,
          cause,
        }),
    });

    const existing = existingRows.at(0);
    if (existing) {
      yield* Effect.annotateLogs(
        Effect.logInfo("iris.capability.experimentReused"),
        {
          runId: input.runId,
          taskId: input.task.id,
          experimentId: existing.id,
        }
      );

      return {
        artifacts: [],
        costCents: 0,
        externalRef: {
          kind: "social_experiment",
          id: existing.id,
          name: existing.name,
          metric: existing.metric,
          reused: true,
        },
      } satisfies IrisTaskExecutionResult;
    }

    yield* Effect.tryPromise({
      try: () =>
        db
          .insert(socialExperiments)
          .values({
            id: experimentId,
            organizationId: input.organizationId,
            name,
            hypothesis: hypothesis ?? null,
            provider: parsed.data.provider,
            variantAPostId,
            variantBPostId,
            metric,
            status: IRIS_EXPERIMENT_RUNNING_STATUS,
          })
          .onConflictDoNothing({ target: socialExperiments.id }),
      catch: (cause) =>
        new IrisCapabilityError({
          message: "Failed to start the A/B test",
          capabilityName: input.task.capabilityName,
          taskId: input.task.id,
          retryable: true,
          cause,
        }),
    });

    yield* Effect.annotateLogs(
      Effect.logInfo("iris.capability.experimentCreated"),
      {
        runId: input.runId,
        taskId: input.task.id,
        experimentId,
        metric,
      }
    );

    return {
      artifacts: [],
      costCents: 0,
      externalRef: {
        kind: "social_experiment",
        id: experimentId,
        name,
        metric,
      },
    } satisfies IrisTaskExecutionResult;
  }
);

const executeExperimentRead = Effect.fn("iris.capabilities.experimentRead")(
  function* (input: ExecuteIrisTaskInput) {
    const parsed = irisExperimentReadTaskParamsSchema.safeParse(
      input.task.params
    );
    if (!parsed.success) {
      return yield* Effect.fail(buildParamsError(input, parsed.error));
    }

    const limit = parsed.data.limit ?? IRIS_EXPERIMENT_DEFAULT_READ_LIMIT;

    const experiments = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: socialExperiments.id,
            name: socialExperiments.name,
            status: socialExperiments.status,
            metric: socialExperiments.metric,
            winner: socialExperiments.winner,
            variantAPostId: socialExperiments.variantAPostId,
            variantBPostId: socialExperiments.variantBPostId,
          })
          .from(socialExperiments)
          .where(eq(socialExperiments.organizationId, input.organizationId))
          .orderBy(desc(socialExperiments.createdAt))
          .limit(limit),
      catch: (cause) =>
        new IrisCapabilityError({
          message: "Failed to read the A/B tests",
          capabilityName: input.task.capabilityName,
          taskId: input.task.id,
          retryable: true,
          cause,
        }),
    });

    const postIds = [
      ...new Set(
        experiments.flatMap((experiment) => [
          experiment.variantAPostId,
          experiment.variantBPostId,
        ])
      ),
    ];

    const configured = isTinybirdConfigured() && postIds.length > 0;

    const looked = configured
      ? yield* Effect.result(
          Effect.tryPromise({
            try: () =>
              queryPostMetricsLookup({
                organization_id: input.organizationId,
                post_ids: postIds,
              }),
            catch: (cause) => cause,
          })
        )
      : null;

    const lookup =
      looked !== null && looked._tag === "Success" ? looked.success : null;

    const metricsByPostId = new Map(
      (lookup?.data ?? []).map((row) => [
        row.platform_post_id,
        {
          impressions: row.impressions,
          likes: row.likes,
          replies: row.replies,
          reposts: row.reposts,
        },
      ])
    );

    yield* Effect.annotateLogs(
      Effect.logInfo("iris.capability.experimentRead"),
      {
        runId: input.runId,
        taskId: input.task.id,
        experimentCount: experiments.length,
      }
    );

    return {
      artifacts: [],
      costCents: 0,
      externalRef: {
        kind: "social_experiments",
        configured: lookup !== null,
        experiments: experiments.map((experiment) => ({
          id: experiment.id,
          name: experiment.name,
          status: experiment.status,
          metric: experiment.metric,
          winner: experiment.winner,
          variant_a: {
            post_id: experiment.variantAPostId,
            value: computeExperimentMetricValue(
              experiment.metric,
              metricsByPostId.get(experiment.variantAPostId) ?? null
            ),
          },
          variant_b: {
            post_id: experiment.variantBPostId,
            value: computeExperimentMetricValue(
              experiment.metric,
              metricsByPostId.get(experiment.variantBPostId) ?? null
            ),
          },
        })),
      },
    } satisfies IrisTaskExecutionResult;
  }
);

const executeChangelogCreate = Effect.fn("iris.capabilities.changelog")(
  function* (input: ExecuteIrisTaskInput) {
    const parsed = irisContentTaskParamsSchema.safeParse(input.task.params);
    if (!parsed.success) {
      return yield* Effect.fail(buildParamsError(input, parsed.error));
    }

    const existing = yield* loadExistingIrisArtifact(input);
    if (existing) {
      return {
        artifacts: [existing],
        costCents: 0,
        externalRef: {
          kind: "changelog",
          postId: existing.postId,
          reused: true,
        },
      } satisfies IrisTaskExecutionResult;
    }

    const generated = yield* generateIrisText({
      input,
      prompt: buildIrisChangelogPrompt({
        topic: parsed.data.topic,
        angle: parsed.data.angle,
        audience: parsed.data.audience,
        signalSummaries: input.signalContext.summaries,
      }),
      maxOutputTokens: CHANGELOG_MAX_OUTPUT_TOKENS,
    });

    const artifact = yield* persistIrisPost({
      input,
      contentType: "changelog",
      title: extractMarkdownTitle(generated.text, parsed.data.topic),
      markdown: generated.text,
    });

    return {
      artifacts: [artifact],
      costCents: generated.costCents,
      externalRef: { kind: "changelog", postId: artifact.postId },
    } satisfies IrisTaskExecutionResult;
  }
);

const executeSocialPostCreate = Effect.fn("iris.capabilities.socialPost")(
  function* (input: ExecuteIrisTaskInput) {
    const parsed = irisSocialPostTaskParamsSchema.safeParse(input.task.params);
    if (!parsed.success) {
      return yield* Effect.fail(buildParamsError(input, parsed.error));
    }

    const existing = yield* loadExistingIrisArtifact(input);
    if (existing) {
      return {
        artifacts: [existing],
        costCents: 0,
        externalRef: {
          kind: "social_post",
          platform: parsed.data.platform,
          postId: existing.postId,
          reused: true,
        },
      } satisfies IrisTaskExecutionResult;
    }

    const generated = yield* generateIrisText({
      input,
      prompt: buildIrisSocialPostPrompt({
        topic: parsed.data.topic,
        angle: parsed.data.angle,
        audience: parsed.data.audience,
        signalSummaries: input.signalContext.summaries,
        platform: parsed.data.platform,
      }),
      maxOutputTokens: SOCIAL_POST_MAX_OUTPUT_TOKENS,
    });

    const artifact = yield* persistIrisPost({
      input,
      contentType: SOCIAL_CONTENT_TYPES[parsed.data.platform],
      title: parsed.data.topic,
      markdown: generated.text,
    });

    return {
      artifacts: [artifact],
      costCents: generated.costCents,
      externalRef: {
        kind: "social_post",
        platform: parsed.data.platform,
        postId: artifact.postId,
      },
    } satisfies IrisTaskExecutionResult;
  }
);

const executeBlogPostCreate = Effect.fn("iris.capabilities.blogPost")(
  function* (input: ExecuteIrisTaskInput) {
    const parsed = irisBlogPostTaskParamsSchema.safeParse(input.task.params);
    if (!parsed.success) {
      return yield* Effect.fail(buildParamsError(input, parsed.error));
    }

    const existing = yield* loadExistingIrisArtifact(input);
    if (existing) {
      return {
        artifacts: [existing],
        costCents: 0,
        externalRef: {
          kind: "blog_post",
          postId: existing.postId,
          reused: true,
        },
      } satisfies IrisTaskExecutionResult;
    }

    const imageCount = Math.min(
      Math.max(parsed.data.imageCount, IRIS_MIN_IMAGES_PER_POST),
      IRIS_MAX_BLOG_POST_IMAGES
    );

    const generated = yield* generateIrisText({
      input,
      prompt: buildIrisBlogPostPrompt({
        topic: parsed.data.topic,
        angle: parsed.data.angle,
        audience: parsed.data.audience,
        signalSummaries: input.signalContext.summaries,
        imageCount,
      }),
      maxOutputTokens: BLOG_POST_MAX_OUTPUT_TOKENS,
    });

    let costCents = generated.costCents;
    const markers = parseIrisImageMarkers(generated.text).slice(0, imageCount);
    const title = extractMarkdownTitle(generated.text, parsed.data.topic);
    const articleContext = buildMarkdownExcerpt(generated.text).slice(
      0,
      IRIS_IMAGE_ARTICLE_CONTEXT_MAX_LENGTH
    );

    const repository =
      markers.length > 0 ? yield* resolveIrisRepository(input) : null;

    if (markers.length > 0 && !repository) {
      yield* Effect.annotateLogs(
        Effect.logWarning("iris.image.integrationMissing"),
        { runId: input.runId, taskId: input.task.id }
      );
    }

    const resolutions: IrisImageResolution[] = [];
    const verdicts: IrisImageOutcome["verdict"][] = [];
    const imagePostIds: string[] = [];
    let firstImageUrl: string | undefined;

    if (repository) {
      for (const marker of markers) {
        const outcome = yield* generateIrisIllustration({
          input,
          repository,
          marker,
          articleTitle: title,
          articleContext,
        });

        costCents += outcome.costCents;
        verdicts.push(outcome.verdict);
        resolutions.push({
          index: marker.index,
          replacement: outcome.image
            ? buildIrisImageMarkdown({
                altText: outcome.image.altText,
                imageUrl: outcome.image.imageUrl,
              })
            : null,
        });

        if (outcome.image) {
          imagePostIds.push(outcome.image.postId);
          firstImageUrl = firstImageUrl ?? outcome.image.imageUrl;
        }
      }
    }

    const markdown = applyIrisImageResolutions(generated.text, resolutions);

    const artifact = yield* persistIrisPost({
      input,
      contentType: "blog_post",
      title,
      markdown,
      imageUrl: firstImageUrl,
    });

    return {
      artifacts: [artifact],
      costCents,
      externalRef: {
        kind: "blog_post",
        postId: artifact.postId,
        requestedImageCount: imageCount,
        markerCount: markers.length,
        imagePostIds,
        imageVerdicts: verdicts,
      },
    } satisfies IrisTaskExecutionResult;
  }
);

export const executeIrisTask = Effect.fn("iris.capabilities.execute")(
  function* (input: ExecuteIrisTaskInput) {
    const annotations = {
      runId: input.runId,
      taskId: input.task.id,
      capability: input.task.capabilityName,
    };

    yield* Effect.annotateLogs(
      Effect.logInfo("iris.capability.started"),
      annotations
    );

    const result = yield* Effect.annotateLogs(
      executeByCapability(input),
      annotations
    );

    yield* Effect.annotateLogs(Effect.logInfo("iris.capability.finished"), {
      ...annotations,
      artifactCount: result.artifacts.length,
      costCents: result.costCents,
    });

    return result;
  }
);

function executeByCapability(
  input: ExecuteIrisTaskInput
): Effect.Effect<IrisTaskExecutionResult, IrisCapabilityError> {
  if (input.task.capabilityName === IRIS_CAPABILITY_SOURCE_GITHUB_READ) {
    return executeSourceGithubRead(input);
  }
  if (input.task.capabilityName === IRIS_CAPABILITY_ANALYTICS_READ) {
    return executeAnalyticsRead(input);
  }
  if (input.task.capabilityName === IRIS_CAPABILITY_EXPERIMENT_READ) {
    return executeExperimentRead(input);
  }
  if (input.task.capabilityName === IRIS_CAPABILITY_EXPERIMENT_CREATE) {
    return executeExperimentCreate(input);
  }
  if (input.task.capabilityName === IRIS_CAPABILITY_CHANGELOG_CREATE) {
    return executeChangelogCreate(input);
  }
  if (input.task.capabilityName === IRIS_CAPABILITY_BLOG_POST_CREATE) {
    return executeBlogPostCreate(input);
  }
  if (input.task.capabilityName === IRIS_CAPABILITY_SOCIAL_POST_CREATE) {
    return executeSocialPostCreate(input);
  }
  return Effect.fail(
    new IrisCapabilityError({
      message: `Unknown capability "${input.task.capabilityName}"`,
      capabilityName: input.task.capabilityName,
      taskId: input.task.id,
      retryable: false,
      cause: null,
    })
  );
}
