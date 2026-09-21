import type { GitHubPublishPullRequestResult } from "@/types/integrations/github";

export function getGitHubPublishDialogCopy(
  contentLabel: string,
  pullRequest: GitHubPublishPullRequestResult | undefined,
  linkedLabel?: string
) {
  if (!pullRequest && linkedLabel) {
    return {
      description: `This ${contentLabel} is linked to ${linkedLabel}. Notra updates that draft pull request when it is still open against the repository's default branch. Otherwise it opens a new draft.`,
      title: "Update the linked pull request",
    };
  }

  if (!pullRequest) {
    return {
      description: `Notra creates a branch, adds the ${contentLabel} as Markdown, and opens a draft pull request against the repository's default branch.`,
      title: "Create a draft pull request",
    };
  }

  const wasCreated = pullRequest.operation === "created";
  return {
    description: wasCreated
      ? `Notra added the ${contentLabel} and opened a draft pull request.`
      : `Notra updated the ${contentLabel} in the existing pull request.`,
    title: wasCreated ? "Draft pull request created" : "Pull request updated",
  };
}
