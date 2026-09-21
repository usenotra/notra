import type { GitHubAppPublishAccess } from "@notra/ai/types/github-operations";

export function githubAppInstallationCanPublishContent(
  access: GitHubAppPublishAccess | null
): boolean | null {
  if (!access) {
    return null;
  }

  return access.contents === "write" && access.pullRequests === "write";
}
