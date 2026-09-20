import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
  GitHubMentionWriteState,
  GitHubMentionWriteTarget,
} from "@notra/ai/types/github-mention";
import {
  createDraftPullRequest,
  createGitHubBranch,
  getGitHubBranchHeadSha,
  getPullRequestHead,
} from "@notra/ai/utils/github-pr-commit";

function followUpBranchName(context: GitHubMentionContext) {
  const kind = context.comment.review ? "review" : "issue";
  return `notra/mention-${context.issueNumber}-${kind}-${context.comment.id}`;
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

  const head = await getPullRequestHead({
    octokit,
    owner: context.owner,
    repo: context.repo,
    pullNumber: context.destination.pullRequestNumber,
  });
  const headIsFork =
    head.headRepoFullName?.toLowerCase() !==
    `${context.owner}/${context.repo}`.toLowerCase();

  if (headIsFork) {
    throw new Error("Fork pull requests are not supported for content writes.");
  }
  const expectedHeadOid = state.commitSha ?? context.destination.headSha;
  if (!expectedHeadOid) {
    throw new Error("Cannot write without the revision read by the agent.");
  }

  if (context.destination.mode === "same_pull_request") {
    if (head.headRef === context.defaultBranch) {
      throw new Error(
        `This pull request's head is the default branch (${context.defaultBranch}). Notra never commits to it; ask for a separate pull request instead.`
      );
    }
    return {
      branch: head.headRef,
      expectedHeadOid,
      pullNumber: head.number,
      pullRequestUrl: head.htmlUrl,
    };
  }

  const branch = state.writeBranch ?? followUpBranchName(context);
  if (state.writeBranch == null) {
    await createGitHubBranch({
      octokit,
      owner: context.owner,
      repo: context.repo,
      branch,
      sha: expectedHeadOid,
    });
    state.writeBranch = branch;
  }

  const actualHeadOid = await getGitHubBranchHeadSha({
    octokit,
    owner: context.owner,
    repo: context.repo,
    branch,
  });
  if (actualHeadOid !== expectedHeadOid) {
    throw new Error(
      "The follow-up branch changed; read it again before editing."
    );
  }

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
