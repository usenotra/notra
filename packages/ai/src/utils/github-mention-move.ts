import {
  GITHUB_MENTION_ACTIVE_CONTENT_BLOCKED_MESSAGE,
  GITHUB_MENTION_FILE_CONTENT_MAX_BYTES,
} from "@notra/ai/constants/github-mention";
import type { GitHubMentionMoveParams } from "@notra/ai/types/github-mention-move";
import { reviewGitHubMentionChange } from "@notra/ai/utils/github-mention-change-review";
import { partitionGitHubMentionPaths } from "@notra/ai/utils/github-mention-path-policy";
import { commitFilesToPullRequest } from "@notra/ai/utils/github-pr-commit";
import { syncPublishedPostAfterCommit } from "@notra/ai/utils/update-published-content";

export async function moveGitHubMentionContent(
  params: GitHubMentionMoveParams
) {
  const { octokit, context, target, fromPath, toPath } = params;
  const { blocked } = partitionGitHubMentionPaths([fromPath, toPath]);
  if (blocked.length > 0) {
    return { error: "Only content files can be moved.", blocked };
  }
  if (fromPath === toPath) {
    return { error: "Source and destination are the same path." };
  }
  const location = {
    owner: context.owner,
    repo: context.repo,
    ref: target.expectedHeadOid,
  };
  // Any existing entry, including a directory or symlink, is a collision.
  const destination = await octokit
    .request("GET /repos/{owner}/{repo}/contents/{path}", {
      ...location,
      path: toPath,
    })
    .catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 404
      ) {
        return null;
      }
      throw error;
    });
  if (destination !== null) {
    return {
      error:
        "The destination already exists. Both paths are unchanged. Ask the commenter for another destination; do not delete, overwrite or merge the existing file, or bypass this conflict with another write tool.",
      conflictingPath: toPath,
    };
  }
  const { data: source } = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      ...location,
      path: fromPath,
    }
  );
  if (
    Array.isArray(source) ||
    source.type !== "file" ||
    !("content" in source) ||
    source.encoding !== "base64" ||
    "target" in source
  ) {
    return {
      error:
        "The source could not be read as a complete text file. Nothing was moved.",
    };
  }
  const bytes = Buffer.from(source.content, "base64");
  if (bytes.length > GITHUB_MENTION_FILE_CONTENT_MAX_BYTES) {
    return {
      error: "Source file is too large to move with the mention agent.",
    };
  }
  const contents = bytes.toString("utf8");
  // A move must preserve the entire source, including BOMs and line endings.
  // Reject truncated responses and lossy UTF-8 decoding before deleting it.
  if (
    bytes.length !== source.size ||
    !Buffer.from(contents, "utf8").equals(bytes)
  ) {
    return {
      error:
        "The source could not be read without data loss. Nothing was moved.",
    };
  }
  const files = [{ path: toPath, contents }];
  const review = await reviewGitHubMentionChange({
    octokit,
    context,
    branch: target.expectedHeadOid,
    files,
  });
  if (review.blocked.length > 0) {
    return {
      error: GITHUB_MENTION_ACTIVE_CONTENT_BLOCKED_MESSAGE,
      blocked: review.blocked,
    };
  }
  const commitSha = await commitFilesToPullRequest({
    octokit,
    owner: context.owner,
    repo: context.repo,
    branch: target.branch,
    expectedHeadOid: target.expectedHeadOid,
    headline: params.headline,
    files,
    deletions: [fromPath],
  });
  params.onCommitted(commitSha);
  const publication =
    context.publication?.path === fromPath ? context.publication : null;
  const publicationSync = await syncPublishedPostAfterCommit({
    octokit,
    organizationId: context.organizationId,
    publication,
    files,
    movedToPath: toPath,
    commitSha,
    expectedHeadOid: target.expectedHeadOid,
    branch: target.branch,
    recordPublicationHead: context.destination.mode === "same_pull_request",
    scheduleRepair: params.scheduleRepair,
  });
  if (publication) {
    // Keep subsequent tools on the moved file, even on a follow-up branch or
    // while a durable repair is pending. Only the sync above changes the DB.
    publication.path = toPath;
    publication.headSha = commitSha;
    publication.markdown =
      publicationSync && publicationSync.status === "synchronized"
        ? publicationSync.markdown
        : contents;
  }
  return { fromPath, path: toPath, commitSha, publicationSync };
}
