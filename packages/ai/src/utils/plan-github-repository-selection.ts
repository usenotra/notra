import { GitHubRepositoryConflictError } from "../schemas/github-operations";
import type {
  ExistingGitHubRepository,
  SaveGitHubRepositorySelectionParams,
} from "../types/github-operations";

export function planGitHubRepositorySelection(
  existing: readonly ExistingGitHubRepository[],
  params: SaveGitHubRepositorySelectionParams
) {
  const byRepositoryId = new Map<string, ExistingGitHubRepository>();
  const byName = new Map<string, ExistingGitHubRepository>();
  for (const record of existing) {
    if (record.githubRepositoryId) {
      byRepositoryId.set(record.githubRepositoryId, record);
    }
    if (record.owner && record.repo) {
      byName.set(`${record.owner}/${record.repo}`.toLowerCase(), record);
    }
  }
  const selections = params.repositories.map((selected) => {
    const { repository } = selected;
    const idMatch = byRepositoryId.get(repository.id);
    const nameMatch = byName.get(
      `${repository.owner}/${repository.name}`.toLowerCase()
    );
    if (
      nameMatch &&
      ((idMatch && idMatch.id !== nameMatch.id) ||
        (nameMatch.githubRepositoryId &&
          nameMatch.githubRepositoryId !== repository.id))
    ) {
      throw new GitHubRepositoryConflictError({
        repository: repository.fullName,
      });
    }
    return { ...selected, integrationId: (idMatch ?? nameMatch)?.id };
  });
  const selectedIds = new Set(
    params.repositories.map(({ repository }) => repository.id)
  );
  const installationIds = new Set(params.installationRecordIds);
  const deselectedIds: string[] = [];
  for (const record of existing) {
    if (
      record.githubAppInstallationId &&
      installationIds.has(record.githubAppInstallationId) &&
      record.githubRepositoryId &&
      !selectedIds.has(record.githubRepositoryId)
    ) {
      deselectedIds.push(record.id);
    }
  }
  return { selections, deselectedIds };
}
