import { GITHUB_API_VERSION_HEADER } from "@notra/ai/constants/autonomy-poll";
import { GITHUB_MENTION_TRUSTED_AUTHOR_ASSOCIATIONS } from "@notra/ai/constants/github-mention";
import type {
  CommitFilesToPullRequestParams,
  GitHubCommentKind,
} from "@notra/ai/types/github-mention";

const GITHUB_API_VERSION_HEADERS = {
  "X-GitHub-Api-Version": GITHUB_API_VERSION_HEADER,
} as const;
const TRUSTED_AUTHOR_ASSOCIATIONS = new Set<string>(
  GITHUB_MENTION_TRUSTED_AUTHOR_ASSOCIATIONS
);
const LAST_PAGE_LINK_PATTERN = /[?&]page=(\d+)[^>]*>;\s*rel="last"/;

/** Newest issue comments, read from the final two pages. */
export async function listGitHubIssueComments(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  issueNumber: number;
}) {
  const fetchPage = (page: number) =>
    params.octokit.request(
      "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner: params.owner,
        repo: params.repo,
        issue_number: params.issueNumber,
        per_page: 100,
        page,
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );
  const first = await fetchPage(1);
  const lastPage = Number(
    LAST_PAGE_LINK_PATTERN.exec(first.headers?.link ?? "")?.[1] ?? 1
  );
  const pages = await Promise.all(
    [lastPage - 1, lastPage]
      .filter((page) => page >= 1)
      .map(async (page) => (page === 1 ? first : await fetchPage(page)).data)
  );
  return pages.flat().map((comment) => ({
    id: comment.id,
    kind: "issue" as const,
    createdAt: comment.created_at,
    threadRootId: null,
    authorLogin: comment.user?.login ?? "unknown",
    authorIsBot: comment.user?.type === "Bot",
    authorIsTrusted: TRUSTED_AUTHOR_ASSOCIATIONS.has(
      comment.author_association
    ),
    body: comment.body ?? "",
  }));
}

export async function postGitHubIssueComment(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  issueNumber: number;
  body: string;
}) {
  const { data } = await params.octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
    {
      owner: params.owner,
      repo: params.repo,
      issue_number: params.issueNumber,
      body: params.body,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return { id: data.id, htmlUrl: data.html_url };
}

function commentReactionsRoute(kind: GitHubCommentKind) {
  return kind === "review"
    ? ("/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions" as const)
    : ("/repos/{owner}/{repo}/issues/comments/{comment_id}/reactions" as const);
}

export async function addGitHubCommentReaction(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  commentId: number;
  kind: GitHubCommentKind;
  content: "eyes" | "+1" | "-1" | "confused";
}) {
  const { data } = await params.octokit.request(
    `POST ${commentReactionsRoute(params.kind)}`,
    {
      owner: params.owner,
      repo: params.repo,
      comment_id: params.commentId,
      content: params.content,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return { id: data.id };
}

export async function removeGitHubCommentReaction(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  commentId: number;
  kind: GitHubCommentKind;
  reactionId: number;
}) {
  await params.octokit.request(
    `DELETE ${commentReactionsRoute(params.kind)}/{reaction_id}`,
    {
      owner: params.owner,
      repo: params.repo,
      comment_id: params.commentId,
      reaction_id: params.reactionId,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
}

export async function listGitHubReviewComments(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  pullNumber: number;
}) {
  const { data } = await params.octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
    {
      owner: params.owner,
      repo: params.repo,
      pull_number: params.pullNumber,
      per_page: 100,
      sort: "created",
      direction: "desc",
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return data.map((comment) => ({
    id: comment.id,
    kind: "review" as const,
    createdAt: comment.created_at,
    threadRootId: comment.in_reply_to_id ?? comment.id,
    authorLogin: comment.user?.login ?? "unknown",
    authorIsBot: comment.user?.type === "Bot",
    authorIsTrusted: TRUSTED_AUTHOR_ASSOCIATIONS.has(
      comment.author_association
    ),
    body: comment.body ?? "",
  }));
}

/**
 * Whether a review thread already holds a comment by one of `authorLogins`.
 * Pages newest-first, so recent threads resolve on the first page; lookup
 * failures propagate so a valid reply is never mistaken for silence.
 */
export async function reviewThreadHasCommentBy(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  pullNumber: number;
  threadRootId: number;
  authorLogins: ReadonlySet<string>;
}) {
  for (let page = 1; ; page += 1) {
    const { data } = await params.octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
      {
        owner: params.owner,
        repo: params.repo,
        pull_number: params.pullNumber,
        per_page: 100,
        sort: "created",
        direction: "desc",
        page,
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );
    const found = data.some(
      (comment) =>
        (comment.in_reply_to_id ?? comment.id) === params.threadRootId &&
        params.authorLogins.has(comment.user?.login ?? "")
    );
    if (found) {
      return true;
    }
    if (data.length < 100) {
      return false;
    }
  }
}

export async function postGitHubReviewComment(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha: string;
  path: string;
  startLine: number | null;
  line: number;
  body: string;
}) {
  const { data } = await params.octokit.request(
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments",
    {
      owner: params.owner,
      repo: params.repo,
      pull_number: params.pullNumber,
      commit_id: params.commitSha,
      path: params.path,
      side: "RIGHT",
      line: params.line,
      ...(params.startLine && params.startLine < params.line
        ? { start_line: params.startLine, start_side: "RIGHT" as const }
        : {}),
      body: params.body,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return { id: data.id, htmlUrl: data.html_url };
}

export async function postGitHubSuggestionReview(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha: string;
  body: string;
  comments: ReadonlyArray<{
    path: string;
    startLine: number;
    line: number;
    body: string;
  }>;
}) {
  const { data } = await params.octokit.request(
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews",
    {
      owner: params.owner,
      repo: params.repo,
      pull_number: params.pullNumber,
      commit_id: params.commitSha,
      event: "COMMENT",
      body: params.body,
      comments: params.comments.map((comment) => ({
        path: comment.path,
        side: "RIGHT",
        line: comment.line,
        ...(comment.startLine < comment.line
          ? { start_line: comment.startLine, start_side: "RIGHT" }
          : {}),
        body: comment.body,
      })),
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return { id: data.id, htmlUrl: data.html_url };
}

export async function replyToGitHubReviewThread(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  pullNumber: number;
  rootCommentId: number;
  body: string;
}) {
  const { data } = await params.octokit.request(
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies",
    {
      owner: params.owner,
      repo: params.repo,
      pull_number: params.pullNumber,
      comment_id: params.rootCommentId,
      body: params.body,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return { id: data.id, htmlUrl: data.html_url };
}
