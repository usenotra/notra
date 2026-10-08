import { createHash } from "node:crypto";

import { SCHEDULED_PUBLICATION_ERROR_CODES } from "@notra/ai/constants/scheduled-publications";
import { getGitHubPublishToken } from "@notra/ai/integrations/github-publish-auth";
import type {
  ScheduledPublicationAttempt,
  ScheduledPublicationOutcome,
} from "@notra/ai/types/scheduled-publications";
import { createOctokit } from "@notra/ai/utils/octokit";
import { isGitHubScheduleContentType } from "@notra/ai/utils/schedule-destinations";
import {
  markScheduledPublicationExternalAttempt,
  recordScheduledPullRequest,
} from "@notra/ai/utils/scheduled-publications";
import { db } from "@notra/db/drizzle";
import { githubIntegrations, posts } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { postGitHubPublishSchema } from "@notra/schemas/dashboard/content";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import { resolveAiProductAccess } from "@/lib/billing/subscription";
import { requestGeoRescanForPublishedPost } from "@/lib/geo/rescan";
import {
  getContentPullRequestState,
  mergeContentPullRequest,
} from "@/lib/integrations/github/content-pull-request";
import { publishSavedContentToGitHub } from "@/lib/integrations/github/publish-saved-content";
import { SocialConnectDeliveryUnknownError } from "@/lib/social-connect/errors";
import { publishSocialPost } from "@/lib/social-connect/publish";
import type {
  ScheduledPublicationPost,
  ScheduledPullRequest,
} from "@/types/content/scheduled-publications";
import type { ContentPullRequestState } from "@/types/integrations/github";
import {
  classifyGitHubPublishFailure,
  hasGitHubStatus,
} from "@/utils/github-publish-failure";

// GitHub's 405 reasons that waiting won't fix: a required check that already
// failed, and a branch protection rule that wants the branch up to date
// (updating it would push a new head and restart the checks).
const GITHUB_MERGE_NEEDS_PERSON_REGEX = /is failing|not up to date/i;

const RETRYABLE_ORPC_CODES = new Set([
  "INTERNAL_SERVER_ERROR",
  "BAD_GATEWAY",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
  "TOO_MANY_REQUESTS",
  "TIMEOUT",
]);

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * A scheduled post has no one waiting on it, so it gives the provider about
 * half a minute to report the platform result before calling it unconfirmed.
 */
const SCHEDULED_SOCIAL_RESULT_POLL_ATTEMPTS = 15;

/**
 * What a GitHub publish takes from the post: the slug and title (which also
 * pick the file path) and the saved markdown.
 */
function postContentHash(post: {
  slug: string | null;
  title: string;
  markdown: string | null;
}) {
  return createHash("sha256")
    .update(JSON.stringify([post.slug, post.title, post.markdown]))
    .digest("hex");
}

/** oRPC errors carry user-facing copy; anything else may carry internals. */
function publicErrorMessage(error: unknown, fallback: string) {
  return error instanceof ORPCError && error.message ? error.message : fallback;
}

/**
 * Pending checks (405), rate limits and upstream errors clear up on their own.
 * A missing pull request, lost access, a rejected request, a branch that
 * moved after Notra pushed it (409), a failed required check, or a branch
 * that must first be brought up to date needs a person.
 */
function isRetryableGitHubMergeError(error: unknown) {
  if ([404, 409, 422].some((status) => hasGitHubStatus(error, status))) {
    return false;
  }
  if (
    hasGitHubStatus(error, 405) &&
    error instanceof Error &&
    GITHUB_MERGE_NEEDS_PERSON_REGEX.test(error.message)
  ) {
    return false;
  }
  const kind = classifyGitHubPublishFailure(error);
  return kind === "rate_limit" || kind === "unknown";
}

function failure(
  code: string,
  message: string,
  retryable: boolean,
  result?: Extract<ScheduledPublicationOutcome, { kind: "error" }>["result"]
): ScheduledPublicationOutcome {
  return { kind: "error", code, message, retryable, result };
}

/** Upstream and infrastructure failures are worth a retry; bad input is not. */
function isRetryablePublishError(error: unknown) {
  if (error instanceof ORPCError) {
    return RETRYABLE_ORPC_CODES.has(error.code);
  }
  return true;
}

async function publishInNotra(
  attempt: ScheduledPublicationAttempt,
  post: ScheduledPublicationPost
): Promise<ScheduledPublicationOutcome> {
  // Guarded like Iris shipping: a post someone published by hand in the
  // meantime counts as done instead of being stamped a second time. The
  // `post.published` webhook comes from the trigger on `posts`.
  const [published] = await db
    .update(posts)
    .set({ status: "published", publishedAt: new Date() })
    .where(
      and(
        eq(posts.id, attempt.postId),
        eq(posts.organizationId, attempt.organizationId),
        eq(posts.status, "draft")
      )
    )
    .returning({ id: posts.id });
  if (!published) {
    return { kind: "published", result: { alreadyPublished: true } };
  }
  await Promise.all([
    requestGeoRescanForPublishedPost({
      organizationId: attempt.organizationId,
      postId: attempt.postId,
    }),
    trackServerEventAndFlush({
      event: POSTHOG_EVENTS.CONTENT_PUBLISHED,
      userId: attempt.createdByUserId,
      organizationId: attempt.organizationId,
      properties: {
        content_id: attempt.postId,
        type: post.contentType,
        from: "schedule",
      },
    }).catch((error: unknown) => {
      console.error("[ScheduledPublication] PostHog capture failed", error);
    }),
  ]);
  return { kind: "published", result: {} };
}

/** One authenticated client per attempt for the scheduled repository. */
async function githubRepositoryClient(
  organizationId: string,
  repositoryId: string
) {
  const repository = await db.query.githubIntegrations.findFirst({
    columns: { owner: true, repo: true },
    where: and(
      eq(githubIntegrations.id, repositoryId),
      eq(githubIntegrations.organizationId, organizationId)
    ),
  });
  if (!(repository?.owner && repository.repo)) {
    return null;
  }
  const token = await getGitHubPublishToken(repositoryId, { organizationId });
  return {
    octokit: createOctokit(token ?? undefined),
    owner: repository.owner,
    repo: repository.repo,
  };
}

type GitHubRepositoryClient = NonNullable<
  Awaited<ReturnType<typeof githubRepositoryClient>>
>;

async function mergePullRequest(
  client: GitHubRepositoryClient,
  pullRequest: ScheduledPullRequest
): Promise<ScheduledPublicationOutcome> {
  const merged = {
    kind: "published",
    result: { ...pullRequest, merged: true },
  } as const;
  const ref = {
    owner: client.owner,
    repo: client.repo,
    pullNumber: pullRequest.pullRequestNumber,
  };

  let state: ContentPullRequestState;
  try {
    state = await getContentPullRequestState(client.octokit, ref);
  } catch (error) {
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.GITHUB_MERGE_FAILED,
      `The pull request could not be loaded: ${errorMessage(error, "unknown error")}`,
      isRetryableGitHubMergeError(error),
      pullRequest
    );
  }
  if (state.status === "merged") {
    return merged;
  }
  if (state.status === "closed") {
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.GITHUB_MERGE_FAILED,
      "The pull request was closed without merging.",
      false,
      pullRequest
    );
  }

  try {
    await mergeContentPullRequest(
      client.octokit,
      ref,
      state,
      pullRequest.headSha
    );
    return merged;
  } catch (error) {
    // Someone may have merged it by hand between the read and the merge.
    const after = await getContentPullRequestState(client.octokit, ref).catch(
      () => null
    );
    if (after?.status === "merged") {
      return merged;
    }
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.GITHUB_MERGE_FAILED,
      hasGitHubStatus(error, 409)
        ? "The pull request changed after Notra pushed it. Review it and merge it on GitHub."
        : `The pull request is open but could not be merged: ${errorMessage(error, "unknown error")}`,
      isRetryableGitHubMergeError(error),
      pullRequest
    );
  }
}

/** A pushed pull request is done once merged, or right away without merge. */
function completePullRequest(
  client: GitHubRepositoryClient,
  merge: boolean,
  pullRequest: ScheduledPullRequest
): Promise<ScheduledPublicationOutcome> | ScheduledPublicationOutcome {
  return merge
    ? mergePullRequest(client, pullRequest)
    : { kind: "published", result: pullRequest };
}

/**
 * The post's linked pull request when it was merged since this row was
 * created. A retry after a merge whose outcome was lost must not publish the
 * file again (it is on the default branch now), so such a merge counts as
 * done. A merge from an earlier publication does not: the post was edited
 * and scheduled again since.
 */
async function findMergedLinkedPullRequest(
  client: GitHubRepositoryClient,
  attempt: ScheduledPublicationAttempt,
  repositoryId: string,
  post: ScheduledPublicationPost
) {
  const linked = postGitHubPublishSchema.safeParse(post.githubPublish);
  if (!(linked.success && linked.data.repositoryId === repositoryId)) {
    return null;
  }
  const state = await getContentPullRequestState(client.octokit, {
    owner: client.owner,
    repo: client.repo,
    pullNumber: linked.data.pullRequestNumber,
  }).catch(() => null);
  const mergedSinceScheduled =
    state?.status === "merged" &&
    state.mergedAt !== null &&
    state.mergedAt >= attempt.createdAt;
  return mergedSinceScheduled ? linked.data : null;
}

async function publishToGitHub(
  attempt: ScheduledPublicationAttempt,
  post: ScheduledPublicationPost,
  config: { repositoryId: string; merge: boolean }
): Promise<ScheduledPublicationOutcome> {
  if (!isGitHubScheduleContentType(post.contentType)) {
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.GITHUB_PUBLISH_FAILED,
      "This content type cannot be published to GitHub.",
      false
    );
  }
  const client = await githubRepositoryClient(
    attempt.organizationId,
    config.repositoryId
  );
  if (!client) {
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.GITHUB_PUBLISH_FAILED,
      "The GitHub repository is no longer connected.",
      false,
      attempt.result ?? undefined
    );
  }

  // What this schedule already pushed, like the pull request opened ahead
  // of the slot or one whose merge failed, unless the post changed since.
  const previous = attempt.result;
  const pushedIsStale =
    previous?.contentHash !== undefined &&
    previous.contentHash !== postContentHash(post);
  if (!pushedIsStale) {
    // A merge since the schedule was created counts as done.
    const merged = config.merge
      ? await findMergedLinkedPullRequest(
          client,
          attempt,
          config.repositoryId,
          post
        )
      : null;
    if (merged) {
      return {
        kind: "published",
        result: {
          merged: true,
          pullRequestNumber: merged.pullRequestNumber,
          pullRequestUrl: merged.pullRequestUrl,
        },
      };
    }
    // An open pull request is merged as it is, pinned to the pushed commit.
    // Pushing again would restart CI, so a repository with required checks
    // could never merge in time.
    if (
      previous?.pullRequestNumber &&
      previous.pullRequestUrl &&
      !previous.merged
    ) {
      return completePullRequest(client, config.merge, {
        pullRequestNumber: previous.pullRequestNumber,
        pullRequestUrl: previous.pullRequestUrl,
        headSha: previous.headSha ?? null,
        contentHash: previous.contentHash,
      });
    }
  }

  let published: Awaited<ReturnType<typeof publishSavedContentToGitHub>>;
  try {
    published = await publishSavedContentToGitHub({
      organizationId: attempt.organizationId,
      contentId: attempt.postId,
      contentType: post.contentType,
      repositoryId: config.repositoryId,
    });
  } catch (error) {
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.GITHUB_PUBLISH_FAILED,
      publicErrorMessage(error, "Publishing to GitHub failed."),
      isRetryablePublishError(error)
    );
  }
  return completePullRequest(client, config.merge, {
    pullRequestNumber: published.pullRequestNumber,
    pullRequestUrl: published.pullRequestUrl,
    headSha: published.headSha ?? null,
    contentHash: postContentHash(post),
  });
}

/**
 * Opens the GitHub pull request when a post is scheduled, so reviews and CI
 * run before the slot; the scheduled run then only updates and merges it.
 * Best effort: without it the run opens the pull request itself.
 */
export async function openScheduledPullRequestAhead(params: {
  organizationId: string;
  postId: string;
  repositoryId: string;
}): Promise<void> {
  try {
    const post = await db.query.posts.findFirst({
      columns: {
        contentType: true,
        githubPublish: true,
        markdown: true,
        slug: true,
        title: true,
      },
      where: and(
        eq(posts.id, params.postId),
        eq(posts.organizationId, params.organizationId)
      ),
    });
    if (
      !post?.markdown ||
      post.githubPublish ||
      !isGitHubScheduleContentType(post.contentType)
    ) {
      return;
    }
    const published = await publishSavedContentToGitHub({
      organizationId: params.organizationId,
      contentId: params.postId,
      contentType: post.contentType,
      repositoryId: params.repositoryId,
    });
    // The publish reads the post itself. Only when it is the same before and
    // after can the fingerprint be trusted to describe what was pushed; an
    // edit in between just means the run pushes again at the slot.
    const after = await db.query.posts.findFirst({
      columns: { markdown: true, slug: true, title: true },
      where: and(
        eq(posts.id, params.postId),
        eq(posts.organizationId, params.organizationId)
      ),
    });
    const contentHash = postContentHash(post);
    if (!after || postContentHash(after) !== contentHash) {
      return;
    }
    await recordScheduledPullRequest({
      organizationId: params.organizationId,
      postId: params.postId,
      repositoryId: params.repositoryId,
      result: {
        pullRequestNumber: published.pullRequestNumber,
        pullRequestUrl: published.pullRequestUrl,
        headSha: published.headSha ?? null,
        contentHash,
      },
    });
  } catch (error) {
    console.warn("[ScheduledPublication] Opening the PR ahead failed", {
      postId: params.postId,
      error,
    });
  }
}

async function publishToSocial(
  attempt: ScheduledPublicationAttempt,
  claimToken: string,
  post: ScheduledPublicationPost,
  accountId: string
): Promise<ScheduledPublicationOutcome> {
  const content = (post.markdown ?? "").trim();
  if (!content) {
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.EMPTY_CONTENT,
      "The post has no text to publish.",
      false
    );
  }
  // Posting is not idempotent. From here on, a lost outcome is final.
  const marked = await markScheduledPublicationExternalAttempt({
    id: attempt.id,
    claimToken,
  });
  if (!marked) {
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.OUTCOME_UNKNOWN,
      "Another attempt already sent this post.",
      false
    );
  }
  // A crash past this point may have happened after the post went out, so a
  // defect counts as an unconfirmed send like a lost response does.
  const outcome = await Effect.runPromise(
    Effect.result(
      publishSocialPost({
        organizationId: attempt.organizationId,
        accountId,
        content,
        resultPollAttempts: SCHEDULED_SOCIAL_RESULT_POLL_ATTEMPTS,
      }).pipe(
        Effect.catchDefect((defect) =>
          Effect.fail(
            new SocialConnectDeliveryUnknownError({
              message: "Publishing crashed after the post was sent",
              cause: defect,
            })
          )
        )
      )
    )
  );
  const unconfirmed =
    outcome._tag === "Failure"
      ? outcome.failure._tag === "SocialConnectDeliveryUnknownError"
      : !outcome.success.confirmed;
  if (unconfirmed) {
    console.error("[ScheduledPublication] Social send unconfirmed", {
      scheduledPublicationId: attempt.id,
      outcome,
    });
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.OUTCOME_UNKNOWN,
      "The post may have gone out, but the platform did not confirm it. Check the account before retrying so it is not posted twice.",
      false
    );
  }
  if (outcome._tag === "Failure") {
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.SOCIAL_PUBLISH_FAILED,
      outcome.failure.message,
      false
    );
  }
  await trackServerEventAndFlush({
    event: POSTHOG_EVENTS.CONTENT_SOCIAL_PUBLISHED,
    userId: attempt.createdByUserId,
    organizationId: attempt.organizationId,
    properties: {
      platform: outcome.success.platform,
      from: "schedule",
      account_id: accountId,
    },
  }).catch((error: unknown) => {
    console.error("[ScheduledPublication] PostHog capture failed", error);
  });
  return {
    kind: "published",
    result: {
      platformPostId: outcome.success.platformPostId,
      postUrl: outcome.success.postUrl,
    },
  };
}

/** Publishes one claimed destination. Never throws for destination errors. */
export async function publishScheduledDestination(
  attempt: ScheduledPublicationAttempt,
  claimToken: string
): Promise<ScheduledPublicationOutcome> {
  const post = await db.query.posts.findFirst({
    columns: {
      contentType: true,
      title: true,
      slug: true,
      markdown: true,
      githubPublish: true,
    },
    where: and(
      eq(posts.id, attempt.postId),
      eq(posts.organizationId, attempt.organizationId)
    ),
  });
  if (!post) {
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.POST_NOT_FOUND,
      "The post no longer exists.",
      false
    );
  }

  let hasAccess: boolean;
  try {
    ({ hasAccess } = await resolveAiProductAccess(attempt.organizationId));
  } catch (error) {
    console.error("[ScheduledPublication] Subscription check failed", {
      scheduledPublicationId: attempt.id,
      error,
    });
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.UNEXPECTED,
      "Could not check the subscription.",
      true
    );
  }
  if (!hasAccess) {
    return failure(
      SCHEDULED_PUBLICATION_ERROR_CODES.SUBSCRIPTION_REQUIRED,
      "An active subscription is required to publish scheduled content.",
      false
    );
  }

  const config = attempt.destinationConfig;
  switch (config.destination) {
    case "notra":
      return publishInNotra(attempt, post);
    case "github":
      return publishToGitHub(attempt, post, config);
    case "social":
      return publishToSocial(attempt, claimToken, post, config.accountId);
    default:
      return failure(
        SCHEDULED_PUBLICATION_ERROR_CODES.UNEXPECTED,
        "Unknown destination.",
        false
      );
  }
}
