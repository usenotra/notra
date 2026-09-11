import { runGitHubMentionAgent } from "@notra/ai/agents/github-mention";
import { GITHUB_MENTION_COMMENT_MAX_LENGTH } from "@notra/ai/constants/github-mention";
import { getGitHubPublishToken } from "@notra/ai/integrations/github-publish-auth";
import type { GitHubAppWebhookPayload } from "@notra/ai/schemas/github-mention";
import type {
  GitHubMentionContext,
  GitHubMentionProcessResult,
  GitHubMentionPullRequest,
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
import {
  addGitHubIssueReaction,
  getPullRequestHead,
  postGitHubIssueComment,
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
}): Promise<
  | { status: "ignored" | "unauthorized"; reason: string }
  | { status: "ready"; context: GitHubMentionContext }
> {
  const sender = params.payload.sender;
  const repository = params.payload.repository;
  const comment = params.payload.comment;
  const issue = params.payload.issue;
  const installation = params.payload.installation;

  if (!(sender && repository && comment && issue && installation)) {
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

  let resolved: GitHubMentionContext | null = null;
  for (const organization of organizations) {
    const auth = await resolveGitHubMentionAuth({
      githubUserId: sender.id,
      organizationId: organization.organizationId,
    });
    if (!auth) {
      continue;
    }
    const integration = await findGitHubIntegrationForMention({
      organizationId: organization.organizationId,
      githubRepositoryId: String(repository.id),
      owner: repository.owner.login,
      repo: repository.name,
    });
    if (!integration?.owner || !integration.repo) {
      continue;
    }

    let pullRequest: GitHubMentionPullRequest | null = null;
    if (issue.pull_request || params.payload.pull_request) {
      const payloadPullRequest = params.payload.pull_request;
      if (payloadPullRequest) {
        pullRequest = {
          number: payloadPullRequest.number,
          title: payloadPullRequest.title,
          body: payloadPullRequest.body ?? null,
          htmlUrl: payloadPullRequest.html_url,
          headRef: payloadPullRequest.head.ref,
          headSha: payloadPullRequest.head.sha,
          baseRef: payloadPullRequest.base.ref,
          draft: Boolean(payloadPullRequest.draft),
        };
      } else {
        const token = await getGitHubPublishToken(integration.id, {
          organizationId: organization.organizationId,
        });
        if (token) {
          pullRequest = await getPullRequestHead({
            octokit: createOctokit(token),
            owner: integration.owner,
            repo: integration.repo,
            pullNumber: issue.number,
          });
        }
      }
    }

    const publication = pullRequest
      ? await findContentPublicationForPullRequest({
          organizationId: organization.organizationId,
          owner: integration.owner,
          repo: integration.repo,
          pullRequestNumber: pullRequest.number,
        })
      : null;

    resolved = {
      deliveryId: params.deliveryId,
      installationId: String(installation.id),
      organizationId: organization.organizationId,
      userId: auth.userId,
      integrationId: integration.id,
      owner: integration.owner,
      repo: integration.repo,
      issueNumber: issue.number,
      comment: {
        id: comment.id,
        body: comment.body,
        htmlUrl: comment.html_url,
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
    };
    break;
  }

  if (!resolved) {
    return { status: "unauthorized", reason: "not_org_member" };
  }
  return { status: "ready", context: resolved };
}

export async function processGitHubMention(
  context: GitHubMentionContext
): Promise<GitHubMentionProcessResult> {
  const token = await getGitHubPublishToken(context.integrationId, {
    organizationId: context.organizationId,
  });
  if (!token) {
    return {
      status: "failed",
      reason: "github_token_unavailable",
    };
  }
  const octokit = createOctokit(token);

  await addGitHubIssueReaction({
    octokit,
    owner: context.owner,
    repo: context.repo,
    issueNumber: context.issueNumber,
    content: "eyes",
  }).catch(() => undefined);

  try {
    const result = await runGitHubMentionAgent({ octokit, context });
    const reply = clipComment(
      result.reply ||
        (result.committed
          ? `Updated this pull request in ${result.commitSha}.`
          : "I looked at this, but I do not have anything to change.")
    );
    await postGitHubIssueComment({
      octokit,
      owner: context.owner,
      repo: context.repo,
      issueNumber: context.issueNumber,
      body: reply,
    });
    return {
      status: result.committed ? "committed" : "replied",
      reply,
      commitSha: result.commitSha,
      pullRequestUrl: result.pullRequestUrl,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await postGitHubIssueComment({
      octokit,
      owner: context.owner,
      repo: context.repo,
      issueNumber: context.issueNumber,
      body: "I could not finish that mention. Please try again from the dashboard if this keeps happening.",
    }).catch(() => undefined);
    return { status: "failed", reason };
  }
}
