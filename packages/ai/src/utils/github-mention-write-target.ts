import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
  GitHubMentionWriteTarget,
} from "@notra/ai/types/github-mention";
import {
  createDraftPullRequest,
  createGitHubBranch,
  getGitHubBranchHeadSha,
  getPullRequestHead,
} from "@notra/ai/utils/github-pr-commit";

export interface GitHubMentionWriteState {
  writeBranch: string | null;
  writePullNumber: number | null;
  writePullRequestUrl: string | null;
}

function followUpBranchName(context: GitHubMentionContext) {
  return `notra/mention-${context.issueNumber}-${context.comment.id}`;
}

export async function resolveGitHubMentionWriteTarget(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
  state: GitHubMentionWriteState;
}): Promise<GitHubMentionWriteTarget> {
  const { octokit, context, state } = params;
  if (
    context.destination.mode === "reply_only" ||
    !context.destination.headRef ||
    !context.destination.pullRequestNumber
  ) {
    throw new Error(
      "This mention is not on a pull request, so files cannot be committed."
    );
  }

  if (context.destination.mode === "same_pull_request") {
    const head = await getPullRequestHead({
      octokit,
      owner: context.owner,
      repo: context.repo,
      pullNumber: context.destination.pullRequestNumber,
    });
    return {
      branch: head.headRef,
      expectedHeadOid: head.headSha,
      pullNumber: head.number,
      pullRequestUrl: head.htmlUrl,
    };
  }

  const branch = state.writeBranch ?? followUpBranchName(context);
  const sourceSha =
    state.writeBranch == null
      ? (
          await getPullRequestHead({
            octokit,
            owner: context.owner,
            repo: context.repo,
            pullNumber: context.destination.pullRequestNumber,
          })
        ).headSha
      : await getGitHubBranchHeadSha({
          octokit,
          owner: context.owner,
          repo: context.repo,
          branch,
        });

  if (state.writeBranch == null) {
    await createGitHubBranch({
      octokit,
      owner: context.owner,
      repo: context.repo,
      branch,
      sha: sourceSha,
    });
    state.writeBranch = branch;
  }

  const expectedHeadOid = await getGitHubBranchHeadSha({
    octokit,
    owner: context.owner,
    repo: context.repo,
    branch,
  });

  return {
    branch,
    expectedHeadOid,
    pullNumber: state.writePullNumber ?? context.destination.pullRequestNumber,
    pullRequestUrl:
      state.writePullRequestUrl ??
      context.pullRequest?.htmlUrl ??
      `https://github.com/${context.owner}/${context.repo}/pull/${context.destination.pullRequestNumber}`,
  };
}

export async function ensureFollowUpPullRequest(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
  state: GitHubMentionWriteState;
  branch: string;
}) {
  if (params.context.destination.mode !== "new_pull_request") {
    return null;
  }
  if (params.state.writePullNumber && params.state.writePullRequestUrl) {
    return {
      number: params.state.writePullNumber,
      htmlUrl: params.state.writePullRequestUrl,
    };
  }

  const base = params.context.destination.headRef;
  if (!base) {
    throw new Error(
      "Cannot open a follow-up pull request without a base branch"
    );
  }

  const pullRequest = await createDraftPullRequest({
    octokit: params.octokit,
    owner: params.context.owner,
    repo: params.context.repo,
    title: `docs: follow-up from @notra mention on #${params.context.issueNumber}`,
    body: `Opened from a GitHub mention that asked for a separate pull request instead of committing on #${params.context.issueNumber}.`,
    head: params.branch,
    base,
  });
  params.state.writePullNumber = pullRequest.number;
  params.state.writePullRequestUrl = pullRequest.htmlUrl;
  return pullRequest;
}
