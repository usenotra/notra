import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";
import {
  isGitHubContentOutputType,
  isPendingOutputId,
} from "@/utils/github-outputs";
import { settleAll } from "@/utils/settle-all";

const definitions = new Map<
  string,
  ReturnType<typeof buildGitHubRepositoriesCollection>
>();

export function githubRepositoriesCollectionId(organizationId: string) {
  return `github-repositories:${organizationId}`;
}

export function githubRepositoriesQueryKey(organizationId: string) {
  return [
    ...dashboardOrpc.integrations.key(),
    "github-db",
    organizationId,
  ] as const;
}

function buildGitHubRepositoriesCollection(organizationId: string) {
  const id = githubRepositoriesCollectionId(organizationId);
  return collectionOptions(id, (client) => {
    const queryClient = client.requireDependency<QueryClient>("queryClient");
    return queryCollectionOptions({
      id,
      queryKey: githubRepositoriesQueryKey(organizationId),
      queryClient,
      queryFn: async () => {
        const response = await dashboardOrpc.integrations.list.call({
          organizationId,
        });
        return response.integrations.filter(
          (integration) => integration.type === "github"
        );
      },
      getKey: (item) => item.id,
      onUpdate: async ({ transaction }) => {
        const calls: Promise<unknown>[] = [];
        for (const mutation of transaction.mutations) {
          const { modified, original } = mutation;
          if (modified.enabled !== original.enabled) {
            calls.push(
              dashboardOrpc.integrations.update.call({
                organizationId,
                integrationId: String(mutation.key),
                enabled: modified.enabled,
              })
            );
          }
          for (const repository of modified.repositories) {
            const originalRepository = original.repositories.find(
              (candidate) => candidate.id === repository.id
            );
            if (
              originalRepository &&
              originalRepository.enabled !== repository.enabled
            ) {
              calls.push(
                dashboardOrpc.integrations.repositories.update.call({
                  organizationId,
                  repositoryId: repository.id,
                  enabled: repository.enabled,
                })
              );
            }
            for (const output of repository.outputs ?? []) {
              const originalOutput = originalRepository?.outputs?.find(
                (candidate) => candidate.outputType === output.outputType
              );
              if (originalOutput?.enabled === output.enabled) {
                continue;
              }
              if (originalOutput && !isPendingOutputId(originalOutput.id)) {
                calls.push(
                  dashboardOrpc.integrations.outputs.update.call({
                    organizationId,
                    outputId: originalOutput.id,
                    enabled: output.enabled,
                  })
                );
                continue;
              }
              if (isGitHubContentOutputType(output.outputType)) {
                calls.push(
                  dashboardOrpc.integrations.repositories.configureOutput.call({
                    organizationId,
                    repositoryId: repository.id,
                    outputType: output.outputType,
                    enabled: output.enabled,
                  })
                );
              }
            }
          }
        }
        await settleAll(calls);
      },
      onDelete: async ({ transaction }) => {
        await settleAll(
          transaction.mutations.map((mutation) =>
            dashboardOrpc.integrations.delete.call({
              organizationId,
              integrationId: String(mutation.key),
            })
          )
        );
      },
    });
  });
}

export function githubRepositoriesCollection(organizationId: string) {
  const existing = definitions.get(organizationId);
  if (existing) {
    return existing;
  }
  const definition = buildGitHubRepositoriesCollection(organizationId);
  definitions.set(organizationId, definition);
  return definition;
}
