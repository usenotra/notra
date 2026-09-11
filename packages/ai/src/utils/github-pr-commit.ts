import { GITHUB_API_VERSION_HEADER } from "@notra/ai/constants/autonomy-poll";
import {
  GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION,
  GITHUB_MENTION_FILE_CONTENT_MAX_BYTES,
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
  if (params.files.length === 0) {
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

export async function addGitHubIssueReaction(params: {
  octokit: CommitFilesToPullRequestParams["octokit"];
  owner: string;
  repo: string;
  issueNumber: number;
  content: "eyes" | "+1";
}) {
  await params.octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/reactions",
    {
      owner: params.owner,
      repo: params.repo,
      issue_number: params.issueNumber,
      content: params.content,
      headers: {
        ...GITHUB_API_VERSION_HEADERS,
        Accept: "application/vnd.github+json",
      },
    }
  );
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
