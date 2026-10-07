import { runGitHubMentionAgent } from "@notra/ai/agents/github-mention";
import {
  confirmGitHubMentionBilling,
  createGitHubMentionUsageCollector,
  describeGitHubMentionBillingDenial,
  releaseGitHubMentionBilling,
  reserveGitHubMentionBilling,
} from "@notra/ai/billing/github-mention-billing";
import {
  GITHUB_MENTION_CHECK_RUN_CONCLUSION_BY_REACTION,
  GITHUB_MENTION_LOG_EVENTS,
} from "@notra/ai/constants/github-mention";
import {
  getGitHubAppInstallationPublishAccess,
  isGitHubAppConfigured,
} from "@notra/ai/integrations/github";
import { getGitHubPublishToken } from "@notra/ai/integrations/github-publish-auth";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { PublicationRepairScheduler } from "@notra/ai/types/content-publication";
import type {
  GitHubMentionContext,
  GitHubMentionProcessResult,
} from "@notra/ai/types/github-mention";
import {
  completeGitHubMentionCheckRun,
  createGitHubMentionCheckRun,
} from "@notra/ai/utils/github-check-run";
import { logGitHubMentionEvent } from "@notra/ai/utils/github-mention-log";
import {
  buildGitHubMentionPermissionReply,
  findMissingGitHubMentionPermissions,
  isGitHubPermissionError,
} from "@notra/ai/utils/github-mention-permissions";
import { consumeGitHubMentionRateLimit } from "@notra/ai/utils/github-mention-rate-limit";
import {
  buildGitHubMentionRateLimitReply,
  buildGitHubMentionReply,
} from "@notra/ai/utils/github-mention-reply";
import {
  clipGitHubComment,
  postGitHubMentionProposal,
  postGitHubMentionReply,
} from "@notra/ai/utils/github-mention-reply-delivery";
import {
  addGitHubCommentReaction,
  postGitHubIssueComment,
  removeGitHubCommentReaction,
} from "@notra/ai/utils/github-pr-comments";
import { getGitHubChangedFiles } from "@notra/ai/utils/github-pr-commit";
import { createOctokit } from "@notra/ai/utils/octokit";
import { retryWrite } from "@notra/ai/utils/retry-write";

export async function processGitHubMention(
  context: GitHubMentionContext,
  scheduleRepair?: PublicationRepairScheduler
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
  // Eyes on the comment while working, swapped for a thumbs up, thumbs down on
  // a declined request, or a confused face on failure. Reactions are cosmetic,
  // so never fail on them.
  // Without the GitHub App the token is a personal one with its own scopes.
  const access = isGitHubAppConfigured()
    ? await getGitHubAppInstallationPublishAccess(context.installationId)
    : null;
  // The check run shows the run on the pull request's checks list. It needs
  // Checks: write on the App, and is as cosmetic as the reactions.
  const headSha = context.pullRequest?.headSha ?? null;
  const checksGranted = access?.checks === "write";
  if (access && headSha && !checksGranted) {
    logGitHubMentionEvent(
      GITHUB_MENTION_LOG_EVENTS.ignored,
      {
        deliveryId: context.deliveryId,
        reason: "check_run_permission_missing",
        settingsUrl: access.settingsUrl ?? null,
      },
      "warn"
    );
  }
  const [workingReaction, checkRun] = await Promise.all([
    addGitHubCommentReaction({
      octokit,
      owner: context.owner,
      repo: context.repo,
      commentId: context.comment.id,
      kind: commentKind,
      content: "eyes",
    }).catch(() => null),
    checksGranted && headSha
      ? createGitHubMentionCheckRun({
          octokit,
          owner: context.owner,
          repo: context.repo,
          headSha,
          detailsUrl: context.comment.htmlUrl,
        }).catch((error: unknown) => {
          logGitHubMentionEvent(
            GITHUB_MENTION_LOG_EVENTS.ignored,
            {
              deliveryId: context.deliveryId,
              reason: "check_run_create_failed",
              error: error instanceof Error ? error.message : String(error),
            },
            "warn"
          );
          return null;
        })
      : null,
  ]);
  // A commit on this pull request moves its head, so the result is reported
  // on the new commit as well or the checks list shows nothing for it.
  let committedHeadSha: string | null = null;
  const finishReaction = async (content: "+1" | "-1" | "confused") => {
    if (checkRun) {
      const conclusion =
        GITHUB_MENTION_CHECK_RUN_CONCLUSION_BY_REACTION[content];
      try {
        await retryWrite(() =>
          completeGitHubMentionCheckRun({
            octokit,
            owner: context.owner,
            repo: context.repo,
            checkRunId: checkRun.id,
            conclusion,
            detailsUrl: context.comment.htmlUrl,
          })
        );
        const newHeadSha = committedHeadSha;
        if (newHeadSha) {
          await retryWrite(() =>
            createGitHubMentionCheckRun({
              octokit,
              owner: context.owner,
              repo: context.repo,
              headSha: newHeadSha,
              detailsUrl: context.comment.htmlUrl,
              conclusion,
            })
          );
        }
      } catch (error) {
        logGitHubMentionEvent(
          GITHUB_MENTION_LOG_EVENTS.ignored,
          {
            deliveryId: context.deliveryId,
            reason: "check_run_complete_failed",
            checkRunId: checkRun.id,
            error: error instanceof Error ? error.message : String(error),
          },
          "warn"
        );
      }
    }
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
  // able to burn a month of them in a minute. A store that is down here would
  // otherwise leave the check run in progress forever.
  const rateLimit = await consumeGitHubMentionRateLimit(
    context.organizationId
  ).catch(async (error: unknown) => {
    await finishReaction("confused");
    throw error;
  });
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
  }).catch(async (error: unknown) => {
    await finishReaction("confused");
    throw error;
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
  const usage = createGitHubMentionUsageCollector();
  const settleBilling = async (
    action: "confirm" | "release",
    usage?: AgentTokenUsage | null
  ) => {
    if (billingSettled) {
      return;
    }
    billingSettled = true;
    try {
      // The agent already ran, so a transient Autumn failure must not be what
      // decides whether it was paid for. A hold that survives every attempt
      // expires on Autumn's side rather than staying charged.
      if (action === "release") {
        await retryWrite(() => releaseGitHubMentionBilling(reservation));
        return;
      }
      await retryWrite(() =>
        confirmGitHubMentionBilling({
          reservation,
          usage: usage ?? null,
          properties: {
            repository: `${context.owner}/${context.repo}`,
            issue_number: context.issueNumber,
          },
        })
      );
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
    const agentResult = await runGitHubMentionAgent({
      octokit,
      context,
      onUsage: usage.add,
      scheduleRepair,
    });
    // The model calls happened, whatever the rest of the run does with them.
    await settleBilling("confirm", usage.get() ?? agentResult.usage);
    if (agentResult.committed) {
      written = {
        commitSha: agentResult.commitSha,
        pullRequestUrl: agentResult.pullRequestUrl,
      };
      if (context.destination.mode === "same_pull_request") {
        committedHeadSha = agentResult.commitSha;
      }
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
    if (
      context.destination.mode === "new_pull_request" &&
      agentResult.committed &&
      agentResult.pullRequestUrl === null
    ) {
      const reply =
        "I committed the change to a follow-up branch, but GitHub did not open the requested draft pull request. Please open the draft pull request from that branch manually.";
      await postGitHubMentionReply({
        octokit,
        context,
        body: reply,
        commitSha: null,
        changedFiles: [],
      });
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
          reason: "follow_up_pull_request_failed",
          commitSha: agentResult.commitSha,
          durationMs: Date.now() - startedAt,
        },
        "error"
      );
      return {
        status: "failed",
        reason: "follow_up_pull_request_failed",
        reply,
        commitSha: agentResult.commitSha,
        pullRequestUrl: null,
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
      agentResult.pullRequestUrl !== null &&
      agentResult.pullRequestUrl !== context.pullRequest?.htmlUrl;
    const reply = clipGitHubComment(
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
    await finishReaction(agentResult.declined ? "-1" : "+1");
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
    // Completed model calls are payable even when a later call or tool fails.
    const paidUsage = usage.get();
    await settleBilling(paidUsage ? "confirm" : "release", paidUsage);
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
