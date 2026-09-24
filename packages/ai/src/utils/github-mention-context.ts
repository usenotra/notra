import { isGitHubAppConfigured } from "@notra/ai/integrations/github";
import { getGitHubPublishToken } from "@notra/ai/integrations/github-publish-auth";
import type {
  GitHubAppWebhookPayload,
  GitHubMentionLogTarget,
  GitHubMentionOctokit,
  GitHubMentionPullRequest,
  GitHubMentionResolveResult,
} from "@notra/ai/types/github-mention";
import { findContentPublicationForPullRequest } from "@notra/ai/utils/content-publication";
import {
  commentMentionsNotra,
  getGitHubMentionAppHandles,
  isGitHubBotSender,
} from "@notra/ai/utils/github-mention";
import {
  findGitHubIntegrationForMention,
  listOrganizationsForGitHubInstallation,
  resolveGitHubMentionAuth,
} from "@notra/ai/utils/github-mention-auth";
import { resolveGitHubMentionDestination } from "@notra/ai/utils/github-mention-destination";
import {
  buildGitHubMentionPermissionReply,
  isGitHubPermissionError,
} from "@notra/ai/utils/github-mention-permissions";
import {
  postGitHubIssueComment,
  reviewThreadHasCommentBy,
} from "@notra/ai/utils/github-pr-comments";
import { getPullRequestHead } from "@notra/ai/utils/github-pr-commit";
import { createOctokit } from "@notra/ai/utils/octokit";

/**
 * Notra's replies come from the App bot, or from the token's own user when a
 * personal token publishes instead of the App. Only the `[bot]` login counts
 * for the App, so a human sharing the slug cannot pass as Notra.
 */
async function listNotraReplyLogins(octokit: GitHubMentionOctokit) {
  const logins = getGitHubMentionAppHandles().map((handle) => `${handle}[bot]`);
  if (!isGitHubAppConfigured()) {
    const { data } = await octokit.request("GET /user");
    logins.push(data.login);
  }
  return new Set(logins);
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
  // A reply in a review thread Notra already answered is aimed at Notra even
  // without the handle. Only the thread lookup below can tell, and that needs
  // the integration first.
  const mentioned = commentMentionsNotra(comment.body);
  if (!(mentioned || comment.in_reply_to_id)) {
    return { status: "ignored", reason: "not_mentioned" };
  }

  const organizations = await listOrganizationsForGitHubInstallation(
    String(installation.id)
  );
  if (organizations.length === 0) {
    return { status: "ignored", reason: "unknown_installation" };
  }

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

    if (!mentioned) {
      const token = await getGitHubPublishToken(integrationId, {
        organizationId,
      });
      if (!token) {
        return { status: "ignored", reason: "github_token_unavailable" };
      }
      const octokit = createOctokit(token);
      const inNotraThread = await reviewThreadHasCommentBy({
        octokit,
        owner,
        repo,
        pullNumber: issueNumber,
        threadRootId: comment.in_reply_to_id ?? comment.id,
        authorLogins: await listNotraReplyLogins(octokit),
      });
      if (!inNotraThread) {
        return { status: "ignored", reason: "not_mentioned" };
      }
    }

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
