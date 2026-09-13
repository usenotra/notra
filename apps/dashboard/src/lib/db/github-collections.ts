import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { collectionOptions } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";

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
        for (const mutation of transaction.mutations) {
          await dashboardOrpc.integrations.update.call({
            organizationId,
            integrationId: String(mutation.key),
            enabled: mutation.modified.enabled,
          });
        }
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await dashboardOrpc.integrations.delete.call({
            organizationId,
            integrationId: String(mutation.key),
          });
        }
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
