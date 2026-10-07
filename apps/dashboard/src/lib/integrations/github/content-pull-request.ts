import { GITHUB_API_VERSION_HEADERS } from "@/constants/github";
import type {
  ContentPullRequestRef,
  ContentPullRequestState,
  GitHubClient,
} from "@/types/integrations/github";
import { hasGitHubStatus } from "@/utils/github-publish-failure";

const GITHUB_MERGE_METHODS = ["squash", "merge", "rebase"] as const;
const MARK_READY_FOR_REVIEW_MUTATION = `
  mutation MarkReadyForReview($pullRequestId: ID!) {
    markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
      pullRequest { id }
    }
  }
`;
const MERGE_METHOD_NOT_ALLOWED_REGEX = /merge method|not allowed/i;

export async function getContentPullRequestState(
  octokit: GitHubClient,
  ref: ContentPullRequestRef
): Promise<ContentPullRequestState> {
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner: ref.owner,
      repo: ref.repo,
      pull_number: ref.pullNumber,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  if (data.merged) {
    return {
      status: "merged",
      mergedAt: data.merged_at ? new Date(data.merged_at) : null,
    };
  }
  if (data.state === "closed") {
    return { status: "closed" };
  }
  return { status: "open", draft: Boolean(data.draft), nodeId: data.node_id };
}

// 405 covers both "method not allowed in this repo" and "not mergeable yet";
// only the first is worth trying the next method for.
function isMergeMethodNotAllowed(error: unknown) {
  return (
    hasGitHubStatus(error, 405) &&
    error instanceof Error &&
    MERGE_METHOD_NOT_ALLOWED_REGEX.test(error.message)
  );
}

/**
 * Merges an open content pull request with the first merge method the
 * repository allows. With `headSha` the merge is pinned to that commit, so a
 * later push is never merged. Notra opens drafts, which GitHub refuses to
 * merge; merging is the go-ahead to leave draft. Throws the GitHub error.
 */
export async function mergeContentPullRequest(
  octokit: GitHubClient,
  ref: ContentPullRequestRef,
  pullRequest: { draft: boolean; nodeId: string },
  headSha: string | null
): Promise<void> {
  if (pullRequest.draft) {
    await octokit.graphql(MARK_READY_FOR_REVIEW_MUTATION, {
      pullRequestId: pullRequest.nodeId,
    });
  }
  let lastError: unknown = null;
  for (const mergeMethod of GITHUB_MERGE_METHODS) {
    try {
      await octokit.request(
        "PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge",
        {
          owner: ref.owner,
          repo: ref.repo,
          pull_number: ref.pullNumber,
          merge_method: mergeMethod,
          ...(headSha ? { sha: headSha } : {}),
          headers: GITHUB_API_VERSION_HEADERS,
        }
      );
      return;
    } catch (error) {
      lastError = error;
      if (!isMergeMethodNotAllowed(error)) {
        break;
      }
    }
  }
  throw lastError;
}
