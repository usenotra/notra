import type { GitHubPublishPullRequestResult } from "@/types/integrations/github";

export function getGitHubPublishDialogCopy(
  contentLabel: string,
  pullRequest: GitHubPublishPullRequestResult | undefined
) {
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
