import { runGitHubMentionAgent } from "@notra/ai/agents/github-mention";
import {
  confirmGitHubMentionBilling,
  describeGitHubMentionBillingDenial,
  releaseGitHubMentionBilling,
  reserveGitHubMentionBilling,
} from "@notra/ai/billing/github-mention-billing";
import {
  GITHUB_MENTION_COMMENT_MAX_LENGTH,
  GITHUB_MENTION_LOG_EVENTS,
} from "@notra/ai/constants/github-mention";
import {
  getGitHubAppInstallationPublishAccess,
  isGitHubAppConfigured,
} from "@notra/ai/integrations/github";
import { getGitHubPublishToken } from "@notra/ai/integrations/github-publish-auth";
import type { GitHubAppWebhookPayload } from "@notra/ai/schemas/github-mention";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type {
  GitHubMentionChangedFile,
  GitHubMentionContext,
  GitHubMentionLogTarget,
  GitHubMentionProcessResult,
  GitHubMentionProposal,
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
  buildGitHubMentionPermissionReply,
  findMissingGitHubMentionPermissions,
  isGitHubPermissionError,
} from "@notra/ai/utils/github-mention-permissions";
import { consumeGitHubMentionRateLimit } from "@notra/ai/utils/github-mention-rate-limit";
import {
  buildGitHubMentionProposalFallbackReply,
  buildGitHubMentionProposalReply,
  buildGitHubMentionRateLimitReply,
  buildGitHubMentionReply,
  findGitHubMentionReplyAnchor,
} from "@notra/ai/utils/github-mention-reply";
import {
  fitGitHubMentionSuggestionsToRange,
  formatGitHubMentionSuggestionBlock,
} from "@notra/ai/utils/github-mention-suggestion";
import {
  addGitHubCommentReaction,
  getGitHubChangedFiles,
  getPullRequestHead,
  postGitHubIssueComment,
  postGitHubReviewComment,
  postGitHubSuggestionReview,
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
          const octokit = createOctokit(token);
          try {
            pullRequest = await getPullRequestHead({
              octokit,
              owner,
              repo,
              pullNumber: issueNumber,
            });
          } catch (error) {
            if (!isGitHubPermissionError(error)) {
              throw error;
            }
            await postGitHubIssueComment({
              octokit,
              owner,
              repo,
              issueNumber,
              body: buildGitHubMentionPermissionReply({
                missing: ["Pull requests: Read"],
                settingsUrl: null,
              }),
            });
            return { status: "ignored", reason: "permission_reply_posted" };
          }
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
                startLine: comment.start_line ?? null,
                commitSha: comment.commit_id ?? null,
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
    // Someone who wrote in a review thread is answered there, also after a
    // commit: a second thread at the changed lines would split the conversation.
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

/**
 * The suggestion for the review thread the mention was written in, when the
 * whole proposal sits on that thread's lines and they still read the same.
 */
function fitProposalToReviewThread(
  context: GitHubMentionContext,
  proposals: readonly GitHubMentionProposal[]
) {
  const review = context.comment.review;
  const [proposal] = proposals;
  if (
    !(review?.line && proposal) ||
    proposals.length > 1 ||
    proposal.path !== review.path ||
    proposal.commitSha !== review.commitSha
  ) {
    return null;
  }
  // The hunk ends on the commented line. If the file reads differently there,
  // the thread's numbers are stale and a suggestion would replace other text.
  const commentedLine = review.diffHunk?.split("\n").at(-1)?.slice(1);
  if (commentedLine !== proposal.previous.split("\n")[review.line - 1]) {
    return null;
  }
  return fitGitHubMentionSuggestionsToRange({
    suggestions: proposal.suggestions,
    previous: proposal.previous,
    range: { startLine: review.startLine ?? review.line, line: review.line },
  });
}

/**
 * Posts a proposed edit as GitHub suggestions: inside the review thread when
 * it fits there, otherwise as one review with a comment per changed region.
 * If GitHub refuses them, the same proposal goes out as a plain diff.
 */
async function postGitHubMentionProposal(params: {
  octokit: ReturnType<typeof createOctokit>;
  context: GitHubMentionContext;
  text: string;
  proposals: readonly GitHubMentionProposal[];
}) {
  const { octokit, context, text, proposals } = params;
  const pullNumber = context.pullRequest?.number;
  const commitSha = proposals[0]?.commitSha;
  try {
    const inline = fitProposalToReviewThread(context, proposals);
    const body = clipComment(
      buildGitHubMentionProposalReply({ text, proposals, inline })
    );
    if (inline && context.comment.review && pullNumber) {
      await replyToGitHubReviewThread({
        octokit,
        owner: context.owner,
        repo: context.repo,
        pullNumber,
        rootCommentId: context.comment.review.rootCommentId,
        body,
      });
      return body;
    }
    if (pullNumber && commitSha) {
      await postGitHubSuggestionReview({
        octokit,
        owner: context.owner,
        repo: context.repo,
        pullNumber,
        commitSha,
        body,
        comments: proposals.flatMap((proposal) =>
          proposal.suggestions.map((suggestion) => ({
            path: suggestion.path,
            startLine: suggestion.startLine,
            line: suggestion.line,
            body: formatGitHubMentionSuggestionBlock(suggestion.replacement),
          }))
        ),
      });
      return body;
    }
  } catch (error) {
    logGitHubMentionEvent(
      GITHUB_MENTION_LOG_EVENTS.ignored,
      {
        deliveryId: context.deliveryId,
        reason: "suggestion_failed",
        error: error instanceof Error ? error.message : String(error),
      },
      "warn"
    );
  }
  const body = clipComment(
    buildGitHubMentionProposalFallbackReply({ text, proposals })
  );
  await postGitHubMentionReply({
    octokit,
    context,
    body,
    commitSha: null,
    changedFiles: [],
  });
  return body;
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
  const [workingReaction, access] = await Promise.all([
    addGitHubCommentReaction({
      octokit,
      owner: context.owner,
      repo: context.repo,
      commentId: context.comment.id,
      kind: commentKind,
      content: "eyes",
    }).catch(() => null),
    // Without the GitHub App the token is a personal one with its own scopes.
    isGitHubAppConfigured()
      ? getGitHubAppInstallationPublishAccess(context.installationId)
      : null,
  ]);
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

  // Some mentions stop before the agent starts: a missing permission, a burst
  // of mentions, an empty credit balance. Each fails the same way on a retry,
  // so the run explains itself on the pull request and ends. If even the reply
  // is refused, the webhook log in the dashboard still carries the reason.
  const refuse = async (params: {
    reply: string;
    logReason: string;
    resultReason?: string;
    fields?: Record<string, unknown>;
  }): Promise<GitHubMentionProcessResult> => {
    let replyPosted = false;
    try {
      await postGitHubMentionReply({
        octokit,
        context,
        body: params.reply,
        commitSha: null,
        changedFiles: [],
      });
      replyPosted = true;
    } catch {
      // A failed reply remains retryable once the cause is corrected.
    }
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
        reason: params.logReason,
        ...params.fields,
        durationMs: Date.now() - startedAt,
      },
      "warn"
    );
    return {
      status: "failed",
      reason: params.resultReason ?? params.logReason,
      ...(replyPosted && { reply: params.reply }),
    };
  };

  const refuseForPermission = (missing: readonly string[]) =>
    refuse({
      reply: buildGitHubMentionPermissionReply({
        missing,
        settingsUrl: access?.settingsUrl ?? null,
      }),
      logReason: "missing_github_permission",
      resultReason:
        missing.length > 0
          ? `The configured GitHub credential is missing a permission: ${missing.join(", ")}`
          : "GitHub refused the request, the configured credential lacks a permission",
      fields: { missing },
    });

  const missingPermissions = findMissingGitHubMentionPermissions({
    access,
    mode: context.destination.mode,
    commentKind,
  });
  if (missingPermissions.length > 0) {
    return await refuseForPermission(missingPermissions);
  }

  // Every run spends credits, so a loop on the repository side must not be
  // able to burn a month of them in a minute.
  const rateLimit = await consumeGitHubMentionRateLimit(context.organizationId);
  if (!rateLimit.allowed) {
    return await refuse({
      reply: buildGitHubMentionRateLimitReply(rateLimit.resetAt),
      logReason: "rate_limited",
      fields: { limit: rateLimit.limit, resetAt: rateLimit.resetAt },
    });
  }

  // Balance is held now and settled with what the run cost, so concurrent
  // mentions cannot both spend the last credit.
  const reservation = await reserveGitHubMentionBilling({
    organizationId: context.organizationId,
    mentionKey: context.deliveryId ?? String(context.comment.id),
  });
  if (!reservation.allowed) {
    return await refuse({
      reply: describeGitHubMentionBillingDenial(reservation),
      logReason: reservation.reason ?? "insufficient_credits",
      fields: {
        billingMode: reservation.mode,
        balanceRemaining: reservation.balanceRemaining ?? null,
      },
    });
  }

  let billingSettled = false;
  const settleBilling = async (
    action: "confirm" | "release",
    usage?: AgentTokenUsage | null
  ) => {
    if (billingSettled) {
      return;
    }
    billingSettled = true;
    try {
      if (action === "release") {
        await releaseGitHubMentionBilling(reservation);
        return;
      }
      await confirmGitHubMentionBilling({
        reservation,
        usage: usage ?? null,
        properties: {
          repository: `${context.owner}/${context.repo}`,
          issue_number: context.issueNumber,
        },
      });
    } catch (error) {
      // Autumn being unreachable must not undo a reply GitHub already has.
      logGitHubMentionEvent(
        GITHUB_MENTION_LOG_EVENTS.billingFailed,
        {
          organizationId: context.organizationId,
          deliveryId: context.deliveryId,
          action,
          error: error instanceof Error ? error.message : String(error),
        },
        "error"
      );
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
    // The model calls happened, whatever the rest of the run does with them.
    await settleBilling("confirm", agentResult.usage);
    if (agentResult.committed) {
      written = {
        commitSha: agentResult.commitSha,
        pullRequestUrl: agentResult.pullRequestUrl,
      };
    }
    if (agentResult.permissionDenied && !agentResult.committed) {
      return await refuseForPermission([]);
    }
    if (agentResult.proposals.length > 0) {
      const reply = await postGitHubMentionProposal({
        octokit,
        context,
        text:
          agentResult.reply ||
          "Here is how I would change it. Commit the suggestion if it works for you, or tell me what to adjust.",
        proposals: agentResult.proposals,
      });
      await finishReaction("+1");
      logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.completed, {
        organizationId: context.organizationId,
        integrationId: context.integrationId,
        deliveryId: context.deliveryId,
        repository: `${context.owner}/${context.repo}`,
        issueNumber: context.issueNumber,
        mentionStatus: "suggested",
        suggestions: agentResult.proposals.reduce(
          (sum, proposal) => sum + proposal.suggestions.length,
          0
        ),
        pullRequestUrl: agentResult.pullRequestUrl,
        durationMs: Date.now() - startedAt,
      });
      return {
        status: "suggested",
        reply,
        commitSha: null,
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
    // A run that never reached the model owes nothing.
    await settleBilling("release");
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
    if (isGitHubPermissionError(error)) {
      return await refuseForPermission([]);
    }
    const errorReply =
      "Sorry, something went wrong on my side and I could not finish this. Mention me again to retry, or make the change from the Notra dashboard.";
    let replyPosted = false;
    try {
      await postGitHubIssueComment({
        octokit,
        owner: context.owner,
        repo: context.repo,
        issueNumber: context.issueNumber,
        body: errorReply,
      });
      replyPosted = true;
    } catch {
      // Leave the delivery retryable when GitHub did not receive the reply.
    }
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
    return {
      status: "failed",
      reason,
      ...(replyPosted && { reply: errorReply }),
    };
  }
}
