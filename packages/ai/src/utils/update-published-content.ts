import type {
  PublicationAncestryValidator,
  PublicationCommitSyncStatus,
  PublicationRepairScheduler,
  PublicationSyncRepair,
} from "@notra/ai/types/content-publication";
import type { GitHubMentionOctokit } from "@notra/ai/types/github-mention";
import { syncContentPublication } from "@notra/ai/utils/content-publication";
import { carryOverImageTargets } from "@notra/ai/utils/github-mention-published-file";
import {
  commitFilesToPullRequest,
  getRepositoryFileContents,
} from "@notra/ai/utils/github-pr-commit";
import { retryWrite } from "@notra/ai/utils/retry-write";

async function syncOrScheduleRepair(
  repair: PublicationSyncRepair,
  isAncestor: PublicationAncestryValidator,
  scheduleRepair?: PublicationRepairScheduler,
  octokit?: GitHubMentionOctokit
): Promise<PublicationCommitSyncStatus> {
  try {
    const prepared = octokit
      ? await preparePublicationSyncRepair(repair, octokit)
      : repair;
    const result = await retryWrite(() =>
      syncContentPublication(prepared, isAncestor)
    );
    if (result.status !== "retry") {
      return result;
    }
  } catch (error) {
    if (!scheduleRepair) {
      return { status: "failed", error: String(error) };
    }
  }
  if (!scheduleRepair) {
    return { status: "failed", error: "repair unavailable" };
  }
  try {
    await scheduleRepair(repair);
    return { status: "pending" };
  } catch (error) {
    return { status: "failed", error: String(error) };
  }
}

export async function preparePublicationSyncRepair(
  repair: PublicationSyncRepair,
  octokit: GitHubMentionOctokit
): Promise<PublicationSyncRepair> {
  const mapping = repair.imageMapping;
  if (!mapping) {
    return repair;
  }
  const recordedFile = await getRepositoryFileContents({
    octokit,
    owner: mapping.owner,
    repo: mapping.repo,
    path: mapping.path,
    ref: mapping.headSha,
  });
  return {
    ...repair,
    imageMapping: undefined,
    markdown: carryOverImageTargets(
      repair.markdown,
      recordedFile,
      mapping.markdown
    ),
  };
}

function githubAncestryValidator(params: {
  octokit: GitHubMentionOctokit;
  owner: string;
  repo: string;
}): PublicationAncestryValidator {
  return async (base, head) => {
    const { data } = await params.octokit.request(
      "GET /repos/{owner}/{repo}/compare/{basehead}",
      { owner: params.owner, repo: params.repo, basehead: `${base}...${head}` }
    );
    return data.status === "ahead" || data.status === "identical";
  };
}

export async function updatePublishedContentAndCommit(params: {
  octokit: GitHubMentionOctokit;
  organizationId: string;
  postId: string;
  markdown: string;
  /** What goes into the repository when it differs from the post (image paths). */
  fileContents?: string;
  title?: string;
  owner: string;
  repo: string;
  branch: string;
  expectedHeadOid: string;
  /** Publication head observed before this operation; independent of GitHub's current head. */
  publicationHeadSha?: string | null;
  path: string;
  publicationId: string;
  commitMessage: string;
  /**
   * False when committing to a follow-up branch that is not the publication's
   * pull request. The post then stays as it is: it mirrors the published pull
   * request, and the follow-up may never be merged into it.
   */
  recordPublicationHead?: boolean;
  onCommitted?: (sha: string) => void;
  scheduleRepair?: PublicationRepairScheduler;
}) {
  // Commit first: a rejected commit (stale head, protected branch) must not
  // leave the Notra post ahead of the pull request.
  const commitSha = await commitFilesToPullRequest({
    octokit: params.octokit,
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
    expectedHeadOid: params.expectedHeadOid,
    headline: params.commitMessage,
    files: [
      { path: params.path, contents: params.fileContents ?? params.markdown },
    ],
  });
  params.onCommitted?.(commitSha);
  let publicationSync: PublicationCommitSyncStatus = { status: "superseded" };
  if (params.recordPublicationHead ?? true) {
    publicationSync = await syncOrScheduleRepair(
      {
        organizationId: params.organizationId,
        publicationId: params.publicationId,
        postId: params.postId,
        baselineHeadSha:
          params.publicationHeadSha === undefined
            ? params.expectedHeadOid
            : params.publicationHeadSha,
        expectedHeadSha: params.expectedHeadOid,
        commitSha,
        branch: params.branch,
        markdown: params.markdown,
        title: params.title,
      },
      githubAncestryValidator(params),
      params.scheduleRepair
    );
  }
  return {
    commitSha,
    postId: params.postId,
    path: params.path,
    publicationSync,
  };
}

/**
 * Synchronizes plain-file and sandbox commits, restoring recorded image URLs.
 * Returns false for unrelated files or follow-up branches; otherwise the sync status.
 */
export async function syncPublishedPostAfterCommit(params: {
  octokit: GitHubMentionOctokit;
  organizationId: string;
  publication: {
    id: string;
    postId: string;
    path: string;
    owner: string;
    repo: string;
    headSha: string | null;
    markdown?: string | null;
  } | null;
  files: ReadonlyArray<{ path: string; contents: string }>;
  commitSha: string;
  expectedHeadOid?: string;
  branch: string;
  recordPublicationHead: boolean;
  scheduleRepair?: PublicationRepairScheduler;
}) {
  const publication = params.publication;
  // A follow-up branch is not the published pull request, so the post stays.
  if (!publication || !params.recordPublicationHead) {
    return false;
  }
  const file = params.files.find((entry) => entry.path === publication.path);
  if (!file) {
    return false;
  }
  const result = await syncOrScheduleRepair(
    {
      organizationId: params.organizationId,
      publicationId: publication.id,
      postId: publication.postId,
      baselineHeadSha: publication.headSha,
      expectedHeadSha:
        params.expectedHeadOid ?? publication.headSha ?? params.commitSha,
      commitSha: params.commitSha,
      branch: params.branch,
      markdown: file.contents,
      ...(publication.headSha
        ? {
            imageMapping: {
              owner: publication.owner,
              repo: publication.repo,
              path: publication.path,
              headSha: publication.headSha,
              markdown: publication.markdown ?? "",
            },
          }
        : {}),
    },
    githubAncestryValidator({
      octokit: params.octokit,
      owner: publication.owner,
      repo: publication.repo,
    }),
    params.scheduleRepair,
    params.octokit
  );
  return result;
}
