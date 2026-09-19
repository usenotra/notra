import type { GitHubMentionOctokit } from "@notra/ai/types/github-mention";
import { updateContentPublicationHead } from "@notra/ai/utils/content-publication";
import { carryOverImageTargets } from "@notra/ai/utils/github-mention-published-file";
import { commitFilesToPullRequest } from "@notra/ai/utils/github-pr-commit";
import { updatePostRecord } from "@notra/ai/utils/post-service";
import { retryWrite } from "@notra/ai/utils/retry-write";

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
  path: string;
  publicationId: string;
  commitMessage: string;
  /** False when committing to a follow-up branch that is not the publication's pull request. */
  recordPublicationHead?: boolean;
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
  await retryWrite(() =>
    updatePostRecord({
      organizationId: params.organizationId,
      postId: params.postId,
      markdown: params.markdown,
      title: params.title,
    })
  );
  if (params.recordPublicationHead ?? true) {
    await retryWrite(() =>
      updateContentPublicationHead({
        publicationId: params.publicationId,
        organizationId: params.organizationId,
        headSha: commitSha,
        branch: params.branch,
      })
    );
  }
  return { commitSha, postId: params.postId, path: params.path };
}

/**
 * Keeps the Notra post in step when the published file was committed through
 * another path (plain file commit or the sandbox). The file's new contents
 * become the post, keeping the post's own image URLs. Returns whether the post
 * changed.
 */
export async function syncPublishedPostAfterCommit(params: {
  organizationId: string;
  publication: {
    id: string;
    postId: string;
    path: string;
    markdown?: string | null;
  } | null;
  files: ReadonlyArray<{ path: string; contents: string }>;
  commitSha: string;
  branch: string;
  recordPublicationHead: boolean;
}) {
  const publication = params.publication;
  if (!publication) {
    return false;
  }
  // Post first, head second: the recorded head is what tells the next mention
  // that Notra is in step with the pull request. If the post write fails, the
  // head stays behind and that mention starts from the file instead.
  const file = params.files.find((entry) => entry.path === publication.path);
  if (file) {
    await retryWrite(() =>
      updatePostRecord({
        organizationId: params.organizationId,
        postId: publication.postId,
        markdown: carryOverImageTargets(
          file.contents,
          publication.markdown ?? ""
        ),
      })
    );
  }
  if (params.recordPublicationHead) {
    await retryWrite(() =>
      updateContentPublicationHead({
        publicationId: publication.id,
        organizationId: params.organizationId,
        headSha: params.commitSha,
        branch: params.branch,
      })
    );
  }
  return Boolean(file);
}
