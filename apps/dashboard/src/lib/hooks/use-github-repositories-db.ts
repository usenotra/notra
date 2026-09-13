"use client";

import { useDbClient, useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import {
  githubRepositoriesCollection,
  githubRepositoriesCollectionId,
  githubRepositoriesQueryKey,
} from "@/lib/db/github-collections";
import {
  clearRowPending,
  getPendingRows,
  markRowPending,
  subscribeToPendingRows,
} from "@/lib/db/pending-rows";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GitHubRepositoriesDbApi } from "@/types/github-db";
import type { GitHubIntegration } from "@/types/integrations";
import { toErrorMessage } from "@/utils/error-message";
import { pendingOutputId } from "@/utils/github-outputs";

export function useGitHubRepositoriesDb(
  organizationId: string
): GitHubRepositoriesDbApi {
  const isEnabled = organizationId.length > 0;
  const dbClient = useDbClient();
  const queryClient = useQueryClient();
  const collectionId = githubRepositoriesCollectionId(organizationId);
  const definition = githubRepositoriesCollection(organizationId);
  const collection = dbClient.collection(definition);

  const pendingRepositoryIds = useSyncExternalStore(
    subscribeToPendingRows,
    () => getPendingRows(collectionId),
    () => getPendingRows(collectionId)
  );

  const { data, isLoading, isError, isReady } = useLiveQuery(
    (q) =>
      isEnabled
        ? q
            .from({ repository: definition })
            .orderBy(({ repository }) => repository.createdAt, "asc")
        : undefined,
    [definition, isEnabled]
  );

  const repositories: GitHubIntegration[] = data ?? [];

  const refetch = async () => {
    await queryClient.invalidateQueries({
      queryKey: githubRepositoriesQueryKey(organizationId),
    });
  };

  const invalidateIntegrationsList = () =>
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.integrations.list.queryKey({
        input: { organizationId },
      }),
    });

  const persist = (
    rowId: string,
    transaction: { isPersisted: { promise: Promise<unknown> } },
    fallback: string
  ) => {
    markRowPending(collectionId, rowId);
    return transaction.isPersisted.promise
      .then(invalidateIntegrationsList)
      .catch((error: unknown) => {
        toast.error(toErrorMessage(error, fallback));
        throw error;
      })
      .finally(() => {
        clearRowPending(collectionId, rowId);
      });
  };

  const setRepositoryEnabled = async (
    integrationId: string,
    enabled: boolean
  ) => {
    const transaction = collection.update(integrationId, (draft) => {
      draft.enabled = enabled;
      for (const repository of draft.repositories) {
        repository.enabled = enabled;
      }
    });
    await persist(integrationId, transaction, "Failed to update repository");
    await queryClient.invalidateQueries({
      queryKey: dashboardOrpc.github.app.get.queryKey({
        input: { organizationId },
      }),
    });
  };

  const setRepositoryOutputEnabled = async (
    repositoryId: string,
    outputType: string,
    enabled: boolean
  ) => {
    const integration = repositories.find((candidate) =>
      candidate.repositories.some(
        (repository) => repository.id === repositoryId
      )
    );
    if (!integration) {
      return;
    }
    const transaction = collection.update(integration.id, (draft) => {
      const repository = draft.repositories.find(
        (candidate) => candidate.id === repositoryId
      );
      if (!repository) {
        return;
      }
      const outputs = repository.outputs ?? [];
      const output = outputs.find(
        (candidate) => candidate.outputType === outputType
      );
      if (output) {
        output.enabled = enabled;
      } else {
        outputs.push({
          id: pendingOutputId(repositoryId, outputType),
          outputType,
          enabled,
        });
      }
      repository.outputs = outputs;
    });
    await persist(integration.id, transaction, "Failed to update publishing");
  };

  const removeRepository = async (integrationId: string) => {
    const transaction = collection.delete(integrationId);
    await persist(integrationId, transaction, "Failed to remove repository");
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.github.app.get.queryKey({
          input: { organizationId },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.automation.key(),
      }),
    ]);
  };

  return {
    repositories,
    isLoading: isEnabled && isLoading,
    isError,
    hasData: isReady && data !== undefined,
    pendingRepositoryIds,
    refetch,
    setRepositoryEnabled,
    setRepositoryOutputEnabled,
    removeRepository,
  };
}
