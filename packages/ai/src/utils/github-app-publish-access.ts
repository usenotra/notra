export interface GitHubAppPublishAccess {
  contents?: string;
  pullRequests?: string;
}

export function githubAppInstallationCanPublishContent(
  access: GitHubAppPublishAccess | null
): boolean | null {
  if (!access) {
    return null;
  }

  return access.contents === "write" && access.pullRequests === "write";
}
