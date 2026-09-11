import { DEFAULT_GITHUB_CONTENT_OUTPUT_ENABLED } from "@/constants/github";
import type { GitHubRepository } from "@/types/integrations";
import type { GitHubPublishContentType } from "@/types/integrations/github";

export function getGitHubPublishRepositoryLists(
  integrations: Array<{
    enabled: boolean;
    repositories: GitHubRepository[];
    type?: string;
  }>
) {
  const connected: GitHubRepository[] = [];
  const publishable: GitHubRepository[] = [];

  for (const integration of integrations) {
    if (integration.type !== "github" || !integration.enabled) {
      continue;
    }

    for (const repository of integration.repositories) {
      if (!repository.enabled) {
        continue;
      }

      connected.push(repository);
      if (repository.defaultBranch) {
        publishable.push(repository);
      }
    }
  }

  return { connected, publishable };
}

export function isGitHubContentPublishingEnabled(
  repository: GitHubRepository,
  contentType: GitHubPublishContentType
): boolean {
  const output = repository.outputs?.find(
    (candidate) => candidate.outputType === contentType
  );

  return output?.enabled ?? DEFAULT_GITHUB_CONTENT_OUTPUT_ENABLED[contentType];
}

export function formatGitHubRepositoryLabel(
  repository: Pick<GitHubRepository, "owner" | "repo">
) {
  return `${repository.owner}/${repository.repo}`;
}

export function resolveGitHubPublishRepositoryId(
  preferredId: string | null | undefined,
  repositories: readonly Pick<GitHubRepository, "id">[]
) {
  if (
    preferredId &&
    repositories.some((repository) => repository.id === preferredId)
  ) {
    return preferredId;
  }

  return repositories[0]?.id ?? "";
}
