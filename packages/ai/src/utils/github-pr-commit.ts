import { GITHUB_API_VERSION_HEADER } from "@notra/ai/constants/autonomy-poll";
import {
  GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION,
  GITHUB_MENTION_FILE_CONTENT_MAX_BYTES,
  GITHUB_MENTION_TRUSTED_AUTHOR_ASSOCIATIONS,
} from "@notra/ai/constants/github-mention";
import type {
  CommitFilesToPullRequestParams,
  GitHubCreateCommitOnBranchResult,
} from "@notra/ai/types/github-mention";

const GITHUB_API_VERSION_HEADERS = {
  "X-GitHub-Api-Version": GITHUB_API_VERSION_HEADER,
} as const;

export async function commitFilesToPullRequest(
  params: CommitFilesToPullRequestParams
) {
  const deletions = params.deletions ?? [];
  if (params.files.length === 0 && deletions.length === 0) {
    throw new Error("At least one file is required to commit");
  }

  for (const file of params.files) {
    const bytes = Buffer.byteLength(file.contents, "utf8");
    if (bytes > GITHUB_MENTION_FILE_CONTENT_MAX_BYTES) {
      throw new Error(
        `File ${file.path} is ${bytes} bytes and exceeds the ${GITHUB_MENTION_FILE_CONTENT_MAX_BYTES} byte limit`
      );
    }
  }

  const result = await params.octokit.graphql<GitHubCreateCommitOnBranchResult>(
    GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION,
    {
      input: {
        branch: {
          repositoryNameWithOwner: `${params.owner}/${params.repo}`,
          branchName: params.branch,
        },
        message: { headline: params.headline },
        expectedHeadOid: params.expectedHeadOid,
        fileChanges: {
          additions: params.files.map((file) => ({
            path: file.path,
            contents: Buffer.from(file.contents).toString("base64"),
          })),
          deletions: deletions.map((path) => ({ path })),
        },
      },
    }
  );

  const commitSha = result.createCommitOnBranch?.commit.oid;
  if (!commitSha) {
    throw new Error("GitHub did not return the content commit");
  }
  return commitSha;
}

export async function getPullRequestHead(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  pullNumber: number;
}) {
  const { data } = await params.octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner: params.owner,
      repo: params.repo,
      pull_number: params.pullNumber,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return {
    number: data.number,
    title: data.title,
    body: data.body ?? null,
    htmlUrl: data.html_url,
    headRef: data.head.ref,
    headSha: data.head.sha,
    headRepoFullName: data.head.repo?.full_name ?? null,
    baseRef: data.base.ref,
    draft: Boolean(data.draft),
  };
}

export async function getRepositoryFileContents(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  path: string;
  ref: string;
}) {
  const { data } = await params.octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      ref: params.ref,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
    throw new Error(`${params.path} is not a file on ${params.ref}`);
  }
  return Buffer.from(data.content, "base64").toString("utf8");
}

const TRUSTED_AUTHOR_ASSOCIATIONS = new Set<string>(
  GITHUB_MENTION_TRUSTED_AUTHOR_ASSOCIATIONS
);
const LAST_PAGE_LINK_PATTERN = /[?&]page=(\d+)[^>]*>;\s*rel="last"/;

/**
 * Newest issue comments. This endpoint only sorts oldest first and ignores
 * `direction`, so on long threads the newest comments sit on the last pages.
 */
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
  // Two pages, so a nearly empty last page still leaves enough context.
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

/** Files changed between two commits, with GitHub's unified patch per file. */
export async function getGitHubChangedFiles(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  baseSha: string;
  headSha: string;
}) {
  const { data } = await params.octokit.request(
    "GET /repos/{owner}/{repo}/compare/{basehead}",
    {
      owner: params.owner,
      repo: params.repo,
      basehead: `${params.baseSha}...${params.headSha}`,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return (data.files ?? []).map((file) => ({
    path: file.filename,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch ?? null,
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

type GitHubCommentKind = "issue" | "review";

/** Issue comments and review comments live under different API roots. */
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
  content: "eyes" | "+1" | "confused";
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

/** Anchors a comment to lines of a file under "Files changed". */
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

function githubStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : null;
  }
  return null;
}

export async function createGitHubBranch(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  branch: string;
  sha: string;
}) {
  try {
    await params.octokit.request("POST /repos/{owner}/{repo}/git/refs", {
      owner: params.owner,
      repo: params.repo,
      ref: `refs/heads/${params.branch}`,
      sha: params.sha,
      headers: GITHUB_API_VERSION_HEADERS,
    });
  } catch (error) {
    if (githubStatus(error) !== 422) {
      throw error;
    }
  }
}

export async function getGitHubBranchHeadSha(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  branch: string;
}) {
  const { data } = await params.octokit.request(
    "GET /repos/{owner}/{repo}/git/ref/{ref}",
    {
      owner: params.owner,
      repo: params.repo,
      ref: `heads/${params.branch}`,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return data.object.sha;
}

export async function createDraftPullRequest(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}) {
  try {
    const { data } = await params.octokit.request(
      "POST /repos/{owner}/{repo}/pulls",
      {
        owner: params.owner,
        repo: params.repo,
        title: params.title,
        body: params.body,
        head: params.head,
        base: params.base,
        draft: true,
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );
    return {
      number: data.number,
      htmlUrl: data.html_url,
      headRef: data.head.ref,
      headSha: data.head.sha,
    };
  } catch (error) {
    if (githubStatus(error) !== 422) {
      throw error;
    }
    const { data: pullRequests } = await params.octokit.request(
      "GET /repos/{owner}/{repo}/pulls",
      {
        owner: params.owner,
        repo: params.repo,
        head: `${params.owner}:${params.head}`,
        state: "open",
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );
    const existing = pullRequests[0];
    if (!existing) {
      throw error;
    }
    return {
      number: existing.number,
      htmlUrl: existing.html_url,
      headRef: existing.head.ref,
      headSha: existing.head.sha,
    };
  }
}
