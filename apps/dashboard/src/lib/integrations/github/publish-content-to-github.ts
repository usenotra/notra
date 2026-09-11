import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { slugify } from "@notra/utils/slugify";

import {
  GITHUB_API_VERSION_HEADERS,
  GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION,
} from "@/constants/github";

import type {
  FindExistingGitHubPullRequestParams,
  GitHubClient,
  GitHubCreateCommitOnBranchResult,
  GitHubPublishContentType,
  GitHubPullRequestOperation,
  GitHubPullRequestSummary,
  PublishContentDraftPullRequestParams,
  ResolveGitHubContentPathParams,
  ValidateExistingGitHubBranchParams,
} from "../../../types/integrations/github";
import { hasGitHubStatus } from "../../../utils/github-publish-failure";
import {
  buildContentPullRequestBody,
  mergeContentPullRequestBody,
} from "./pull-request-body";

export class GitHubContentTargetExistsError extends Error {}

export class GitHubRepositoryEmptyError extends Error {}

export class GitHubContentBranchConflictError extends Error {
  readonly branchName: string;

  constructor(branchName: string, path: string) {
    super(
      `Branch ${branchName} contains changes that do not belong to ${path}`
    );
    this.name = "GitHubContentBranchConflictError";
    this.branchName = branchName;
  }
}

export class GitHubContentPublishError extends Error {
  readonly branchName: string | null;
  readonly cause: unknown;

  constructor(
    message: string,
    cause: unknown,
    branchName: string | null = null
  ) {
    super(message);
    this.name = "GitHubContentPublishError";
    this.branchName = branchName;
    this.cause = cause;
  }
}

export function resolveGitHubContentPath(
  params: ResolveGitHubContentPathParams
) {
  if (params.customPath) {
    return params.customPath;
  }

  const fileName =
    slugify(params.slug ?? "") || slugify(params.title) || params.contentId;
  return `${params.directory ? `${params.directory}/` : ""}${fileName}.md`;
}

function createLegacyContentBranchName(
  path: string,
  contentType: GitHubPublishContentType,
  contentId: string
) {
  const slug = slugify(path).slice(0, 40);
  const targetHash = createHash("sha256")
    .update(`${contentId}\0${path}`)
    .digest("hex")
    .slice(0, 16);
  const prefix = contentType === "changelog" ? "changelog" : "blog-post";
  return `notra/${prefix}-${slug || "update"}-${targetHash}`;
}

function toPullRequestResult(
  pullRequest: GitHubPullRequestSummary,
  branchName: string,
  path: string,
  operation: GitHubPullRequestOperation
) {
  return {
    branchName,
    operation,
    path,
    pullRequestNumber: pullRequest.number,
    pullRequestUrl: pullRequest.html_url,
  };
}

async function findExistingPullRequest(
  params: FindExistingGitHubPullRequestParams
) {
  const { data: pullRequests } = await params.octokit.request(
    "GET /repos/{owner}/{repo}/pulls",
    {
      owner: params.owner,
      repo: params.repo,
      base: params.defaultBranch,
      head: `${params.owner}:${params.branchName}`,
      state: "open",
      per_page: 1,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return pullRequests[0];
}

async function findLegacyContentPullRequest(
  octokit: GitHubClient,
  params: PublishContentDraftPullRequestParams,
  baseSha: string
) {
  const prefix = params.contentType === "changelog" ? "changelog" : "blog-post";
  for (let page = 1; ; page += 1) {
    const { data: pullRequests } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls",
      {
        owner: params.owner,
        repo: params.repo,
        base: params.defaultBranch,
        state: "open",
        per_page: 100,
        page,
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );
    for (const pullRequest of pullRequests) {
      if (
        pullRequest.head.repo?.full_name.toLowerCase() !==
          `${params.owner}/${params.repo}`.toLowerCase() ||
        !pullRequest.head.ref.startsWith(`notra/${prefix}-`) ||
        !pullRequest.head.ref.slice(`notra/${prefix}-`.length).includes("-")
      ) {
        continue;
      }
      const { data: comparison } = await octokit.request(
        "GET /repos/{owner}/{repo}/compare/{basehead}",
        {
          owner: params.owner,
          repo: params.repo,
          basehead: `${baseSha}...${pullRequest.head.sha}`,
          headers: GITHUB_API_VERSION_HEADERS,
        }
      );
      if (
        comparison.files?.some(
          (file) =>
            createLegacyContentBranchName(
              file.filename,
              params.contentType,
              params.contentId
            ) === pullRequest.head.ref
        )
      ) {
        return pullRequest;
      }
    }
    if (pullRequests.length < 100) {
      return undefined;
    }
  }
}

async function getPullRequestAfterCommit(params: {
  octokit: GitHubClient;
  owner: string;
  pullRequestNumber: number;
  repo: string;
}) {
  const { data } = await params.octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner: params.owner,
      repo: params.repo,
      pull_number: params.pullRequestNumber,
      headers: GITHUB_API_VERSION_HEADERS,
    }
  );
  return data;
}

/**
 * Older pull requests were created before the article and "Open in Notra"
 * button were part of the description. When republishing to an open pull
 * request, refresh its body so it picks up the latest draft. Failures are
 * non-fatal: the content commit already landed.
 */
async function ensurePullRequestBody(params: {
  currentBody: string | null | undefined;
  octokit: GitHubClient;
  owner: string;
  pullRequestNumber: number;
  publishParams: PublishContentDraftPullRequestParams;
  repo: string;
}) {
  const body = mergeContentPullRequestBody(params.currentBody, {
    badgeUrls: params.publishParams.badgeUrls,
    contentType: params.publishParams.contentType,
    contentUrl: params.publishParams.contentUrl,
    markdown: params.publishParams.markdown,
    title: params.publishParams.title,
  });
  if ((params.currentBody ?? "") === body) {
    return;
  }
  try {
    await params.octokit.request(
      "PATCH /repos/{owner}/{repo}/pulls/{pull_number}",
      {
        owner: params.owner,
        repo: params.repo,
        pull_number: params.pullRequestNumber,
        body,
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );
  } catch {
    // Best effort only; the content update itself already succeeded.
  }
}

async function isContentOnDefaultBranch(
  octokit: GitHubClient,
  params: PublishContentDraftPullRequestParams
) {
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner: params.owner,
        repo: params.repo,
        path: params.path,
        ref: params.defaultBranch,
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );
    return (
      !Array.isArray(data) &&
      "content" in data &&
      Buffer.from(data.content, "base64").toString("utf8") === params.markdown
    );
  } catch (error) {
    if (hasGitHubStatus(error, 404)) {
      return false;
    }
    throw new GitHubContentPublishError(
      "Failed to reconcile the published content",
      error
    );
  }
}

async function assertRecoverableContentBranch(
  params: ValidateExistingGitHubBranchParams
) {
  let branchHeadSha: string;
  try {
    const { data: branchRef } = await params.octokit.request(
      "GET /repos/{owner}/{repo}/git/ref/{ref}",
      {
        owner: params.owner,
        repo: params.repo,
        ref: `heads/${params.branchName}`,
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );
    branchHeadSha = branchRef.object.sha;
  } catch (error) {
    throw new GitHubContentPublishError(
      "Failed to read the existing content branch",
      error,
      params.branchName
    );
  }

  let comparison: Awaited<ReturnType<GitHubClient["request"]>>["data"];

  try {
    const response = await params.octokit.request(
      "GET /repos/{owner}/{repo}/compare/{basehead}",
      {
        owner: params.owner,
        repo: params.repo,
        basehead: `${params.baseSha}...${branchHeadSha}`,
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );
    comparison = response.data;
  } catch (error) {
    throw new GitHubContentPublishError(
      "Failed to validate the existing content branch",
      error,
      params.branchName
    );
  }

  if (!("ahead_by" in comparison) || !("files" in comparison)) {
    throw new GitHubContentBranchConflictError(params.branchName, params.path);
  }

  const files = comparison.files ?? [];
  const branchHasNoChanges = comparison.ahead_by === 0 && files.length === 0;
  const branchOnlyAddsTarget =
    files.length === 1 &&
    files[0]?.filename.toLowerCase().endsWith(".md") &&
    files[0].status === "added" &&
    !("previous_filename" in files[0]);

  if (!(branchHasNoChanges || branchOnlyAddsTarget)) {
    throw new GitHubContentBranchConflictError(params.branchName, params.path);
  }

  return { branchHeadSha, path: files[0]?.filename ?? params.path };
}

async function commitContentToBranch(
  octokit: GitHubClient,
  params: PublishContentDraftPullRequestParams,
  branchName: string,
  branchHeadSha: string
) {
  // Authored by the GitHub App bot when the caller uses an installation token.
  try {
    const result = await octokit.graphql<GitHubCreateCommitOnBranchResult>(
      GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION,
      {
        input: {
          branch: {
            repositoryNameWithOwner: `${params.owner}/${params.repo}`,
            branchName,
          },
          message: { headline: `docs: add ${params.title}` },
          expectedHeadOid: branchHeadSha,
          fileChanges: {
            additions: [
              {
                path: params.path,
                contents: Buffer.from(params.markdown).toString("base64"),
              },
            ],
          },
        },
      }
    );
    const commitSha = result.createCommitOnBranch?.commit.oid;
    if (!commitSha) {
      throw new Error("GitHub did not return the content commit");
    }
    return commitSha;
  } catch (error) {
    try {
      const { data: currentRef } = await octokit.request(
        "GET /repos/{owner}/{repo}/git/ref/{ref}",
        {
          owner: params.owner,
          repo: params.repo,
          ref: `heads/${branchName}`,
          headers: GITHUB_API_VERSION_HEADERS,
        }
      );
      if (currentRef.object.sha !== branchHeadSha) {
        throw new GitHubContentBranchConflictError(branchName, params.path);
      }
    } catch (reconciliationError) {
      if (reconciliationError instanceof GitHubContentBranchConflictError) {
        throw reconciliationError;
      }
    }
    throw new GitHubContentPublishError(
      "GitHub could not create the content commit",
      error,
      branchName
    );
  }
}

async function assertContentCommitIsBranchHead(params: {
  branchHeadBeforeCommit: string;
  branchName: string;
  commitSha: string;
  observedPullRequestHead?: string;
  octokit: GitHubClient;
  owner: string;
  path: string;
  repo: string;
}) {
  if (params.observedPullRequestHead === params.commitSha) {
    return;
  }
  if (
    params.observedPullRequestHead &&
    params.observedPullRequestHead !== params.branchHeadBeforeCommit
  ) {
    throw new GitHubContentBranchConflictError(params.branchName, params.path);
  }

  for (const retryDelay of [0, 100, 250, 500]) {
    if (retryDelay > 0) {
      await delay(retryDelay);
    }

    let currentHeadSha: string;
    try {
      const { data: currentRef } = await params.octokit.request(
        "GET /repos/{owner}/{repo}/git/ref/{ref}",
        {
          owner: params.owner,
          repo: params.repo,
          ref: `heads/${params.branchName}`,
          headers: GITHUB_API_VERSION_HEADERS,
        }
      );
      currentHeadSha = currentRef.object.sha;
    } catch (error) {
      throw new GitHubContentPublishError(
        "Failed to verify the content branch after committing",
        error,
        params.branchName
      );
    }

    if (currentHeadSha === params.commitSha) {
      return;
    }
    if (currentHeadSha !== params.branchHeadBeforeCommit) {
      throw new GitHubContentBranchConflictError(
        params.branchName,
        params.path
      );
    }
  }

  throw new GitHubContentBranchConflictError(params.branchName, params.path);
}

async function assertContentDestinationMissing(
  octokit: GitHubClient,
  params: PublishContentDraftPullRequestParams,
  baseSha: string
) {
  let destinationMissing = false;
  try {
    await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      ref: baseSha,
      headers: GITHUB_API_VERSION_HEADERS,
    });
  } catch (error) {
    if (!hasGitHubStatus(error, 404)) {
      throw new GitHubContentPublishError(
        "Failed to check the destination path",
        error
      );
    }
    destinationMissing = true;
  }

  if (!destinationMissing) {
    throw new GitHubContentTargetExistsError(
      `${params.path} already exists in ${params.owner}/${params.repo}`
    );
  }
}

export async function publishContentDraftPullRequest(
  octokit: GitHubClient,
  requestedParams: PublishContentDraftPullRequestParams
) {
  let baseSha: string;

  try {
    const { data: baseRef } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/ref/{ref}",
      {
        owner: requestedParams.owner,
        repo: requestedParams.repo,
        ref: `heads/${requestedParams.defaultBranch}`,
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );
    baseSha = baseRef.object.sha;
  } catch (error) {
    if (hasGitHubStatus(error, 409)) {
      throw new GitHubRepositoryEmptyError(
        `${requestedParams.owner}/${requestedParams.repo} does not have an initial commit`
      );
    }
    throw new GitHubContentPublishError(
      "Failed to read the repository's default branch",
      error
    );
  }

  const prefix =
    requestedParams.contentType === "changelog" ? "changelog" : "blog-post";
  const contentHash = createHash("sha256")
    .update(requestedParams.contentId)
    .digest("hex")
    .slice(0, 16);
  let branchName = `notra/${prefix}-${contentHash}`;
  let existingPullRequest: GitHubPullRequestSummary | undefined;

  try {
    existingPullRequest = await findExistingPullRequest({
      branchName,
      defaultBranch: requestedParams.defaultBranch,
      octokit,
      owner: requestedParams.owner,
      repo: requestedParams.repo,
    });
    if (!existingPullRequest) {
      const legacyPullRequest = await findLegacyContentPullRequest(
        octokit,
        requestedParams,
        baseSha
      );
      if (legacyPullRequest) {
        existingPullRequest = legacyPullRequest;
        branchName = legacyPullRequest.head.ref;
      }
    }
  } catch (error) {
    throw new GitHubContentPublishError(
      "Failed to check for an existing content pull request",
      error
    );
  }

  let createdBranch = false;
  if (!existingPullRequest) {
    let branchExists = true;
    try {
      await octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
        owner: requestedParams.owner,
        repo: requestedParams.repo,
        ref: `heads/${branchName}`,
        headers: GITHUB_API_VERSION_HEADERS,
      });
    } catch (error) {
      if (!hasGitHubStatus(error, 404)) {
        throw new GitHubContentPublishError(
          "Failed to check for an existing content branch",
          error,
          branchName
        );
      }
      branchExists = false;
    }
    // A branch left by an earlier attempt may use a different path. Its
    // recorded destination is checked after branch validation below.
    if (!branchExists) {
      await assertContentDestinationMissing(octokit, requestedParams, baseSha);
    }
    try {
      await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
        owner: requestedParams.owner,
        repo: requestedParams.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
        headers: GITHUB_API_VERSION_HEADERS,
      });
      createdBranch = true;
    } catch (error) {
      if (hasGitHubStatus(error, 422)) {
        try {
          existingPullRequest = await findExistingPullRequest({
            branchName,
            defaultBranch: requestedParams.defaultBranch,
            octokit,
            owner: requestedParams.owner,
            repo: requestedParams.repo,
          });
        } catch (reconciliationError) {
          throw new GitHubContentPublishError(
            "Failed to reconcile the existing content branch",
            reconciliationError,
            branchName
          );
        }
      } else {
        throw new GitHubContentPublishError(
          "GitHub could not create the content branch",
          error
        );
      }
    }
  }

  const contentBranch = createdBranch
    ? { branchHeadSha: baseSha, path: requestedParams.path }
    : await assertRecoverableContentBranch({
        baseSha,
        branchName,
        octokit,
        owner: requestedParams.owner,
        path: requestedParams.path,
        repo: requestedParams.repo,
      });
  // The first content commit records the publication path. Keep it even when
  // the post's slug or the repository's configured output directory changes.
  const params = { ...requestedParams, path: contentBranch.path };
  const { branchHeadSha } = contentBranch;

  await assertContentDestinationMissing(octokit, params, baseSha);

  const commitSha = await commitContentToBranch(
    octokit,
    params,
    branchName,
    branchHeadSha
  );

  if (existingPullRequest) {
    let pullRequestAfterCommit: Awaited<
      ReturnType<typeof getPullRequestAfterCommit>
    >;
    try {
      pullRequestAfterCommit = await getPullRequestAfterCommit({
        octokit,
        owner: params.owner,
        pullRequestNumber: existingPullRequest.number,
        repo: params.repo,
      });
    } catch (error) {
      throw new GitHubContentPublishError(
        "Failed to verify the updated pull request",
        error,
        branchName
      );
    }
    if (pullRequestAfterCommit.state === "open") {
      await assertContentCommitIsBranchHead({
        branchHeadBeforeCommit: branchHeadSha,
        branchName,
        commitSha,
        observedPullRequestHead: pullRequestAfterCommit.head.sha,
        octokit,
        owner: params.owner,
        path: params.path,
        repo: params.repo,
      });
      await ensurePullRequestBody({
        currentBody: pullRequestAfterCommit.body,
        octokit,
        owner: params.owner,
        pullRequestNumber: existingPullRequest.number,
        publishParams: params,
        repo: params.repo,
      });
      return toPullRequestResult(
        existingPullRequest,
        branchName,
        params.path,
        "updated"
      );
    }
    if (await isContentOnDefaultBranch(octokit, params)) {
      return toPullRequestResult(
        existingPullRequest,
        branchName,
        params.path,
        "updated"
      );
    }
    existingPullRequest = undefined;
  }

  try {
    const { data: pullRequest } = await octokit.request(
      "POST /repos/{owner}/{repo}/pulls",
      {
        owner: params.owner,
        repo: params.repo,
        base: params.defaultBranch,
        head: branchName,
        title: `docs: add ${params.title}`,
        body: buildContentPullRequestBody({
          badgeUrls: params.badgeUrls,
          contentType: params.contentType,
          contentUrl: params.contentUrl,
          markdown: params.markdown,
          title: params.title,
        }),
        draft: true,
        headers: GITHUB_API_VERSION_HEADERS,
      }
    );

    const pullRequestAfterCommit = await getPullRequestAfterCommit({
      octokit,
      owner: params.owner,
      pullRequestNumber: pullRequest.number,
      repo: params.repo,
    });
    await assertContentCommitIsBranchHead({
      branchHeadBeforeCommit: branchHeadSha,
      branchName,
      commitSha,
      observedPullRequestHead: pullRequestAfterCommit.head.sha,
      octokit,
      owner: params.owner,
      path: params.path,
      repo: params.repo,
    });

    return toPullRequestResult(pullRequest, branchName, params.path, "created");
  } catch (error) {
    if (
      error instanceof GitHubContentBranchConflictError ||
      error instanceof GitHubContentPublishError
    ) {
      throw error;
    }

    try {
      const existingPullRequest = await findExistingPullRequest({
        branchName,
        defaultBranch: params.defaultBranch,
        octokit,
        owner: params.owner,
        repo: params.repo,
      });
      if (existingPullRequest) {
        const pullRequestAfterCommit = await getPullRequestAfterCommit({
          octokit,
          owner: params.owner,
          pullRequestNumber: existingPullRequest.number,
          repo: params.repo,
        });
        await assertContentCommitIsBranchHead({
          branchHeadBeforeCommit: branchHeadSha,
          branchName,
          commitSha,
          observedPullRequestHead: pullRequestAfterCommit.head.sha,
          octokit,
          owner: params.owner,
          path: params.path,
          repo: params.repo,
        });
        await ensurePullRequestBody({
          currentBody: pullRequestAfterCommit.body,
          octokit,
          owner: params.owner,
          pullRequestNumber: existingPullRequest.number,
          publishParams: params,
          repo: params.repo,
        });
        return toPullRequestResult(
          existingPullRequest,
          branchName,
          params.path,
          "created"
        );
      }
    } catch (reconciliationError) {
      if (
        reconciliationError instanceof GitHubContentBranchConflictError ||
        reconciliationError instanceof GitHubContentPublishError
      ) {
        throw reconciliationError;
      }
      throw new GitHubContentPublishError(
        `GitHub may have created the draft pull request. Check branch: ${branchName}`,
        reconciliationError,
        branchName
      );
    }

    throw new GitHubContentPublishError(
      "GitHub could not create the draft pull request",
      error,
      branchName
    );
  }
}
