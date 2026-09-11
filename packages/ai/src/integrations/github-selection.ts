import { Effect } from "effect";

import {
  GitHubInstallationMissingError,
  GitHubRepositoryUnavailableError,
} from "../schemas/github-operations";
import type {
  GitHubRepositorySelectionDependencies,
  SelectGitHubRepositoriesParams,
  SelectedGitHubRepository,
} from "../types/github-operations";

export const selectGitHubRepositories = Effect.fn("GitHub.selectRepositories")(
  function* (
    params: SelectGitHubRepositoriesParams,
    dependencies: GitHubRepositorySelectionDependencies
  ) {
    const installations = yield* dependencies.listInstallations(
      params.organizationId
    );
    if (installations.length === 0) {
      return yield* Effect.fail(
        new GitHubInstallationMissingError({
          organizationId: params.organizationId,
        })
      );
    }

    const available = yield* Effect.forEach(
      installations,
      (installation) =>
        dependencies
          .listRepositories(installation)
          .pipe(Effect.map((repositories) => ({ installation, repositories }))),
      { concurrency: 4 }
    );
    const repositoriesById = new Map<string, SelectedGitHubRepository>();
    for (const { installation, repositories } of available) {
      for (const repository of repositories) {
        repositoriesById.set(repository.id, {
          repository,
          installationRecordId: installation.id,
        });
      }
    }

    const repositories: SelectedGitHubRepository[] = [];
    for (const repositoryId of new Set(params.repositoryIds)) {
      const selected = repositoriesById.get(repositoryId);
      if (!selected) {
        return yield* Effect.fail(
          new GitHubRepositoryUnavailableError({ repositoryId })
        );
      }
      repositories.push(selected);
    }

    yield* dependencies.saveSelection({
      preserveExisting: params.preserveExisting,
      organizationId: params.organizationId,
      userId: params.userId,
      installationRecordIds: installations.map(
        (installation) => installation.id
      ),
      repositories,
    });

    // The transaction has committed. A cache outage must not turn a saved
    // selection into a failed request that asks the user to repeat the write.
    yield* Effect.forEach(
      installations,
      (installation) =>
        dependencies.invalidateRepositories(installation).pipe(
          Effect.catch(() =>
            Effect.logWarning(
              "Failed to invalidate GitHub repository cache"
            ).pipe(
              Effect.annotateLogs({
                organizationId: params.organizationId,
                installationId: installation.installationId,
              })
            )
          )
        ),
      { concurrency: 4, discard: true }
    );

    return { selectedRepositoryIds: params.repositoryIds };
  }
);
