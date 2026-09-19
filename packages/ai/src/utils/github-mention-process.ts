import { runGitHubMentionAgent } from "@notra/ai/agents/github-mention";
import {
  GITHUB_MENTION_COMMENT_MAX_LENGTH,
  GITHUB_MENTION_LOG_EVENTS,
} from "@notra/ai/constants/github-mention";
import { getGitHubPublishToken } from "@notra/ai/integrations/github-publish-auth";
import type { GitHubAppWebhookPayload } from "@notra/ai/schemas/github-mention";
import type {
  GitHubMentionChangedFile,
  GitHubMentionContext,
  GitHubMentionLogTarget,
  GitHubMentionProcessResult,
  GitHubMentionPullRequest,
  GitHubMentionResolveResult,
} from "@notra/ai/types/github-mention";
import { findContentPublicationForPullRequest } from "@notra/ai/utils/content-publication";
import {
  commentMentionsNotra,
  isGitHubBotSender,
} from "@notra/ai/utils/github-mention";
import {
  findGitHubIntegrationForMention,
  listOrganizationsForGitHubInstallation,
  resolveGitHubMentionAuth,
} from "@notra/ai/utils/github-mention-auth";
import { resolveGitHubMentionDestination } from "@notra/ai/utils/github-mention-destination";
import { logGitHubMentionEvent } from "@notra/ai/utils/github-mention-log";
import {
  buildGitHubMentionReply,
  findGitHubMentionReplyAnchor,
} from "@notra/ai/utils/github-mention-reply";
import {
  addGitHubCommentReaction,
  getGitHubChangedFiles,
  getPullRequestHead,
  postGitHubIssueComment,
  postGitHubReviewComment,
  removeGitHubCommentReaction,
  replyToGitHubReviewThread,
} from "@notra/ai/utils/github-pr-commit";
import { createOctokit } from "@notra/ai/utils/octokit";

function clipComment(body: string) {
  if (body.length <= GITHUB_MENTION_COMMENT_MAX_LENGTH) {
    return body;
  }
  return body.slice(0, GITHUB_MENTION_COMMENT_MAX_LENGTH);
}

export async function resolveGitHubMentionContext(params: {
  payload: GitHubAppWebhookPayload;
  deliveryId: string | null;
}): Promise<GitHubMentionResolveResult> {
  const sender = params.payload.sender;
  const repository = params.payload.repository;
  const comment = params.payload.comment;
  const issue = params.payload.issue;
  const installation = params.payload.installation;

  // Review comments carry the pull request instead of an issue.
  const issueNumber = issue?.number ?? params.payload.pull_request?.number;
  if (!(sender && repository && comment && issueNumber && installation)) {
    return { status: "ignored", reason: "missing_payload_fields" };
  }
  if (params.payload.action && params.payload.action !== "created") {
    return { status: "ignored", reason: "not_created" };
  }
  if (isGitHubBotSender(sender)) {
    return { status: "ignored", reason: "bot_sender" };
  }
  if (!commentMentionsNotra(comment.body)) {
    return { status: "ignored", reason: "not_mentioned" };
  }

  const organizations = await listOrganizationsForGitHubInstallation(
    String(installation.id)
  );
  if (organizations.length === 0) {
    return { status: "ignored", reason: "unknown_installation" };
  }

  // An installation can be linked to several organizations. Check them together
  // and only proceed when exactly one has both the member and the repository.
  const resolved = await Promise.all(
    organizations.map(async ({ organizationId }) => {
      const auth = await resolveGitHubMentionAuth({
        githubUserId: sender.id,
        organizationId,
      });
      if (!auth) {
        return null;
      }
      const integration = await findGitHubIntegrationForMention({
        organizationId,
        githubRepositoryId: String(repository.id),
        owner: repository.owner.login,
        repo: repository.name,
      });
      if (!integration?.owner || !integration.repo) {
        return null;
      }
      return {
        organizationId,
        userId: auth.userId,
        integrationId: integration.id,
        owner: integration.owner,
        repo: integration.repo,
      };
    })
  );
  const candidates = resolved.filter((candidate) => candidate !== null);

  if (candidates.length > 1) {
    return { status: "ignored", reason: "ambiguous_organization" };
  }

  const match = candidates[0];
  if (match) {
    const { organizationId, userId, integrationId, owner, repo } = match;

    let pullRequest: GitHubMentionPullRequest | null = null;
    if (issue?.pull_request || params.payload.pull_request) {
      const payloadPullRequest = params.payload.pull_request;
      if (payloadPullRequest) {
        pullRequest = {
          number: payloadPullRequest.number,
          title: payloadPullRequest.title,
          body: payloadPullRequest.body ?? null,
          htmlUrl: payloadPullRequest.html_url,
          headRef: payloadPullRequest.head.ref,
          headSha: payloadPullRequest.head.sha,
          headRepoFullName: payloadPullRequest.head.repo?.full_name ?? null,
          baseRef: payloadPullRequest.base.ref,
          draft: Boolean(payloadPullRequest.draft),
        };
      } else {
        const token = await getGitHubPublishToken(integrationId, {
          organizationId,
        });
        if (token) {
          pullRequest = await getPullRequestHead({
            octokit: createOctokit(token),
            owner,
            repo,
            pullNumber: issueNumber,
          });
        }
      }
    }

    const publication = pullRequest
      ? await findContentPublicationForPullRequest({
          organizationId,
          owner,
          repo,
          pullRequestNumber: pullRequest.number,
        })
      : null;

    return {
      status: "ready",
      context: {
        deliveryId: params.deliveryId,
        installationId: String(installation.id),
        organizationId,
        userId,
        integrationId,
        owner,
        repo,
        defaultBranch: repository.default_branch,
        issueNumber,
        comment: {
          id: comment.id,
          body: comment.body,
          htmlUrl: comment.html_url,
          review: comment.path
            ? {
                path: comment.path,
                line: comment.line ?? null,
                diffHunk: comment.diff_hunk ?? null,
                rootCommentId: comment.in_reply_to_id ?? comment.id,
              }
            : null,
        },
        sender: {
          id: sender.id,
          login: sender.login,
          type: sender.type,
        },
        pullRequest,
        destination: resolveGitHubMentionDestination({
          commentBody: comment.body,
          pullRequest,
        }),
        publication,
      },
    };
  }

  let logTarget: GitHubMentionLogTarget | undefined;
  for (const organization of organizations) {
    const integration = await findGitHubIntegrationForMention({
      organizationId: organization.organizationId,
      githubRepositoryId: String(repository.id),
      owner: repository.owner.login,
      repo: repository.name,
    });
    if (integration?.owner && integration.repo) {
      logTarget = {
        organizationId: organization.organizationId,
        integrationId: integration.id,
        owner: integration.owner,
        repo: integration.repo,
      };
      break;
    }
  }
  return { status: "unauthorized", reason: "not_org_member", logTarget };
}

/**
 * Replies where the conversation is: inside the review thread the mention came
 * from, or, after a commit, anchored to the changed lines under "Files changed".
 * Anything GitHub refuses (line outside the diff, outdated thread) falls back
 * to a regular comment so the reply is never lost.
 */
async function postGitHubMentionReply(params: {
  octokit: ReturnType<typeof createOctokit>;
  context: GitHubMentionContext;
  body: string;
  commitSha: string | null;
  changedFiles: readonly GitHubMentionChangedFile[];
}) {
  const { octokit, context, body } = params;
  const pullNumber = context.pullRequest?.number;
  try {
    if (context.comment.review && pullNumber) {
      return await replyToGitHubReviewThread({
        octokit,
        owner: context.owner,
        repo: context.repo,
        pullNumber,
        rootCommentId: context.comment.review.rootCommentId,
        body,
      });
    }
    const anchor = params.commitSha
      ? findGitHubMentionReplyAnchor(
          params.changedFiles,
          context.publication?.path ?? null
        )
      : null;
    if (anchor && params.commitSha && pullNumber) {
      return await postGitHubReviewComment({
        octokit,
        owner: context.owner,
        repo: context.repo,
        pullNumber,
        commitSha: params.commitSha,
        path: anchor.path,
        startLine: anchor.startLine,
        line: anchor.line,
        body,
      });
    }
  } catch (error) {
    logGitHubMentionEvent(
      GITHUB_MENTION_LOG_EVENTS.ignored,
      {
        deliveryId: context.deliveryId,
        reason: "inline_reply_failed",
        error: error instanceof Error ? error.message : String(error),
      },
      "warn"
    );
  }
  return await postGitHubIssueComment({
    octokit,
    owner: context.owner,
    repo: context.repo,
    issueNumber: context.issueNumber,
    body,
  });
}

export async function processGitHubMention(
  context: GitHubMentionContext
): Promise<GitHubMentionProcessResult> {
  const startedAt = Date.now();
  logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.processing, {
    organizationId: context.organizationId,
    integrationId: context.integrationId,
    deliveryId: context.deliveryId,
    repository: `${context.owner}/${context.repo}`,
    issueNumber: context.issueNumber,
    senderLogin: context.sender.login,
    destinationMode: context.destination.mode,
    postId: context.publication?.postId ?? null,
  });

  const token = await getGitHubPublishToken(context.integrationId, {
    organizationId: context.organizationId,
  });
  if (!token) {
    const result = {
      status: "failed" as const,
      reason: "github_token_unavailable",
    };
    logGitHubMentionEvent(
      GITHUB_MENTION_LOG_EVENTS.completed,
      {
        organizationId: context.organizationId,
        integrationId: context.integrationId,
        deliveryId: context.deliveryId,
        repository: `${context.owner}/${context.repo}`,
        issueNumber: context.issueNumber,
        mentionStatus: result.status,
        reason: result.reason,
        durationMs: Date.now() - startedAt,
      },
      "error"
    );
    return result;
  }
  const octokit = createOctokit(token);

  const commentKind = context.comment.review ? "review" : "issue";
  // Eyes on the comment while working, swapped for a thumbs up (or a confused
  // face) once the mention is handled. Reactions are cosmetic, so never fail on them.
  const workingReaction = await addGitHubCommentReaction({
    octokit,
    owner: context.owner,
    repo: context.repo,
    commentId: context.comment.id,
    kind: commentKind,
    content: "eyes",
  }).catch(() => null);
  const finishReaction = async (content: "+1" | "confused") => {
    await addGitHubCommentReaction({
      octokit,
      owner: context.owner,
      repo: context.repo,
      commentId: context.comment.id,
      kind: commentKind,
      content,
    }).catch(() => undefined);
    if (workingReaction) {
      await removeGitHubCommentReaction({
        octokit,
        owner: context.owner,
        repo: context.repo,
        commentId: context.comment.id,
        kind: commentKind,
        reactionId: workingReaction.id,
      }).catch(() => undefined);
    }
  };

  // Set once the agent returns. A failure after a commit (the reply could not
  // be posted) must not read as a failed run: the delivery claim would be
  // released and a redelivery would commit the same change again.
  let written: {
    commitSha: string | null;
    pullRequestUrl: string | null;
  } | null = null;
  try {
    const agentResult = await runGitHubMentionAgent({ octokit, context });
    if (agentResult.committed) {
      written = {
        commitSha: agentResult.commitSha,
        pullRequestUrl: agentResult.pullRequestUrl,
      };
    }
    const baseSha = context.pullRequest?.headSha ?? null;
    // The diff is decoration: a failed compare must not lose the reply.
    const changedFiles =
      agentResult.commitSha && baseSha
        ? await getGitHubChangedFiles({
            octokit,
            owner: context.owner,
            repo: context.repo,
            baseSha,
            headSha: agentResult.commitSha,
          }).catch(() => [])
        : [];
    const openedFollowUp =
      context.destination.mode === "new_pull_request" &&
      agentResult.pullRequestUrl !== context.pullRequest?.htmlUrl;
    const reply = clipComment(
      buildGitHubMentionReply({
        text:
          agentResult.reply ||
          (agentResult.committed
            ? "Done, I pushed the change. Take a look and tell me if you want it worded differently."
            : "I took a look, but I did not find anything to change here. Tell me what you would like to be different and I will pick it up."),
        owner: context.owner,
        repo: context.repo,
        commitSha: agentResult.commitSha,
        files: changedFiles,
        followUpPullRequestUrl: openedFollowUp
          ? agentResult.pullRequestUrl
          : null,
      })
    );
    await postGitHubMentionReply({
      octokit,
      context,
      body: reply,
      commitSha: openedFollowUp ? null : agentResult.commitSha,
      changedFiles,
    });
    await finishReaction("+1");
    const result = {
      status: agentResult.committed
        ? ("committed" as const)
        : ("replied" as const),
      reply,
      commitSha: agentResult.commitSha,
      pullRequestUrl: agentResult.pullRequestUrl,
    };
    logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.completed, {
      organizationId: context.organizationId,
      integrationId: context.integrationId,
      deliveryId: context.deliveryId,
      repository: `${context.owner}/${context.repo}`,
      issueNumber: context.issueNumber,
      mentionStatus: result.status,
      commitSha: result.commitSha,
      pullRequestUrl: result.pullRequestUrl,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (written) {
      await postGitHubIssueComment({
        octokit,
        owner: context.owner,
        repo: context.repo,
        issueNumber: context.issueNumber,
        body: "I pushed the change, but could not post the full reply. Take a look at the latest commit and tell me if you want it worded differently.",
      }).catch(() => undefined);
      await finishReaction("+1");
      logGitHubMentionEvent(
        GITHUB_MENTION_LOG_EVENTS.completed,
        {
          organizationId: context.organizationId,
          integrationId: context.integrationId,
          deliveryId: context.deliveryId,
          repository: `${context.owner}/${context.repo}`,
          issueNumber: context.issueNumber,
          mentionStatus: "committed",
          reason: "reply_failed",
          error: reason,
          commitSha: written.commitSha,
          pullRequestUrl: written.pullRequestUrl,
          durationMs: Date.now() - startedAt,
        },
        "warn"
      );
      return { status: "committed", reason: "reply_failed", ...written };
    }
    await postGitHubIssueComment({
      octokit,
      owner: context.owner,
      repo: context.repo,
      issueNumber: context.issueNumber,
      body: "Sorry, something went wrong on my side and I could not finish this. Mention me again to retry, or make the change from the Notra dashboard.",
    }).catch(() => undefined);
    await finishReaction("confused");
    logGitHubMentionEvent(
      GITHUB_MENTION_LOG_EVENTS.completed,
      {
        organizationId: context.organizationId,
        integrationId: context.integrationId,
        deliveryId: context.deliveryId,
        repository: `${context.owner}/${context.repo}`,
        issueNumber: context.issueNumber,
        mentionStatus: "failed",
        reason,
        durationMs: Date.now() - startedAt,
      },
      "error"
    );
    return { status: "failed", reason };
  }
}
