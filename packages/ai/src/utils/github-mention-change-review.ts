import { GITHUB_MENTION_LOG_EVENTS } from "@notra/ai/constants/github-mention";
import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";
import {
  findNewActiveContent,
  type GitHubMentionContentFinding,
} from "@notra/ai/utils/github-mention-content-policy";
import { logGitHubMentionEvent } from "@notra/ai/utils/github-mention-log";
import { getRepositoryFileContents } from "@notra/ai/utils/github-pr-commit";

function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

/**
 * Gate in front of every mention commit. The path allowlist keeps mentions in
 * content files; this keeps the content from turning into code. Each file is
 * compared with its version on the branch, and a change that adds active
 * content (MDX module code or expressions, scripts, embeds, handlers) is
 * reported instead of committed.
 */
export async function reviewGitHubMentionChange(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
  branch: string;
  files: ReadonlyArray<{ path: string; contents: string }>;
}): Promise<{ blocked: GitHubMentionContentFinding[] }> {
  const findings = await Promise.all(
    params.files.map(async (file) => {
      const previous = await getRepositoryFileContents({
        octokit: params.octokit,
        owner: params.context.owner,
        repo: params.context.repo,
        path: file.path,
        ref: params.branch,
      }).catch((error: unknown) => {
        // Not on the branch yet means a new file, where everything counts as
        // added. Any other failure stops the write instead of guessing.
        if (isNotFound(error)) {
          return null;
        }
        throw error;
      });
      return findNewActiveContent({
        path: file.path,
        previous,
        next: file.contents,
      });
    })
  );
  const blocked = findings.flat();
  if (blocked.length > 0) {
    logGitHubMentionEvent(
      GITHUB_MENTION_LOG_EVENTS.changeBlocked,
      {
        organizationId: params.context.organizationId,
        deliveryId: params.context.deliveryId,
        repository: `${params.context.owner}/${params.context.repo}`,
        issueNumber: params.context.issueNumber,
        senderLogin: params.context.sender.login,
        blocked: blocked.map((finding) => `${finding.path}: ${finding.reason}`),
      },
      "warn"
    );
  }
  return { blocked };
}
