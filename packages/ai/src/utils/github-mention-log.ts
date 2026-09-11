import {
  GITHUB_MENTION_LOG_COMMENT_MAX_LENGTH,
  GITHUB_MENTION_LOG_EVENTS,
} from "@notra/ai/constants/github-mention";
import { log } from "@notra/ai/evlog";
import type {
  GitHubMentionContext,
  GitHubMentionLogTarget,
  GitHubMentionProcessResult,
  GitHubMentionWebhookLog,
} from "@notra/ai/types/github-mention";

export function snippetForGitHubMentionLog(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  if (value.length <= GITHUB_MENTION_LOG_COMMENT_MAX_LENGTH) {
    return value;
  }
  return `${value.slice(0, GITHUB_MENTION_LOG_COMMENT_MAX_LENGTH)}…`;
}

function repositoryLabel(owner: string, repo: string) {
  return `${owner}/${repo}`;
}

function issueLabel(owner: string, repo: string, issueNumber: number) {
  return `${repositoryLabel(owner, repo)}#${issueNumber}`;
}

export function logGitHubMentionEvent(
  event: (typeof GITHUB_MENTION_LOG_EVENTS)[keyof typeof GITHUB_MENTION_LOG_EVENTS],
  fields: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info"
) {
  try {
    const payload = { event, ...fields };
    if (level === "error") {
      log.error(payload);
      return;
    }
    if (level === "warn") {
      log.warn(payload);
      return;
    }
    log.info(payload);
  } catch (error) {
    console.error("[evlog] github mention event capture failed", error);
  }
}

export function buildAcceptedMentionWebhookLog(
  context: GitHubMentionContext
): GitHubMentionWebhookLog {
  const issue = issueLabel(context.owner, context.repo, context.issueNumber);
  return {
    organizationId: context.organizationId,
    integrationId: context.integrationId,
    title: `@notra mention on ${issue}`,
    status: "pending",
    statusCode: 202,
    payload: mentionPayloadFromContext(context, "accepted"),
  };
}

export function buildUnauthorizedMentionWebhookLog(params: {
  target: GitHubMentionLogTarget;
  issueNumber: number;
  senderLogin: string;
  commentUrl: string;
  commentBody: string;
}): GitHubMentionWebhookLog {
  const issue = issueLabel(
    params.target.owner,
    params.target.repo,
    params.issueNumber
  );
  return {
    organizationId: params.target.organizationId,
    integrationId: params.target.integrationId,
    title: `Ignored unauthorized @notra mention on ${issue}`,
    status: "skipped",
    statusCode: 200,
    errorMessage: "Commenter is not a linked organization member.",
    payload: {
      event: "issue_comment",
      mentionStatus: "unauthorized",
      repository: repositoryLabel(params.target.owner, params.target.repo),
      issueNumber: params.issueNumber,
      senderLogin: params.senderLogin,
      commentUrl: params.commentUrl,
      commentSnippet: snippetForGitHubMentionLog(params.commentBody),
    },
  };
}

export function buildMentionResultWebhookLog(params: {
  context: GitHubMentionContext;
  result: GitHubMentionProcessResult;
  durationMs: number;
}): GitHubMentionWebhookLog {
  const issue = issueLabel(
    params.context.owner,
    params.context.repo,
    params.context.issueNumber
  );
  let title = `Replied to @notra mention on ${issue}`;
  let status: GitHubMentionWebhookLog["status"] = "success";
  let statusCode = 200;
  if (params.result.status === "failed") {
    title = `Failed @notra mention on ${issue}`;
    status = "failed";
    statusCode = 500;
  } else if (params.result.status === "committed") {
    title = `Updated ${issue} from @notra mention`;
  }
  return {
    organizationId: params.context.organizationId,
    integrationId: params.context.integrationId,
    title,
    status,
    statusCode,
    errorMessage:
      params.result.status === "failed"
        ? (params.result.reason ?? "Mention processing failed")
        : null,
    payload: {
      ...mentionPayloadFromContext(params.context, params.result.status),
      durationMs: params.durationMs,
      commitSha: params.result.commitSha ?? null,
      pullRequestUrl: params.result.pullRequestUrl ?? null,
      replySnippet: snippetForGitHubMentionLog(params.result.reply),
    },
  };
}

function mentionPayloadFromContext(
  context: GitHubMentionContext,
  mentionStatus: string
) {
  return {
    event: "issue_comment",
    mentionStatus,
    repository: repositoryLabel(context.owner, context.repo),
    issueNumber: context.issueNumber,
    senderLogin: context.sender.login,
    destinationMode: context.destination.mode,
    commentUrl: context.comment.htmlUrl,
    commentSnippet: snippetForGitHubMentionLog(context.comment.body),
    postId: context.publication?.postId ?? null,
    pullRequestUrl: context.pullRequest?.htmlUrl ?? null,
  };
}
