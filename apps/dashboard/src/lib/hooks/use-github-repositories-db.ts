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

  const persist = async (
    repositoryId: string,
    transaction: { isPersisted: { promise: Promise<unknown> } },
    fallback: string,
    success: string
  ) => {
    markRowPending(collectionId, repositoryId);
    try {
      await transaction.isPersisted.promise;
      toast.success(success);
    } catch (error) {
      toast.error(toErrorMessage(error, fallback));
      throw error;
    } finally {
      clearRowPending(collectionId, repositoryId);
    }
  };

  const setRepositoryEnabled = async (
    repositoryId: string,
    enabled: boolean
  ) => {
    const transaction = collection.update(repositoryId, (draft) => {
      draft.enabled = enabled;
      for (const repository of draft.repositories) {
        repository.enabled = enabled;
      }
    });
    await persist(
      repositoryId,
      transaction,
      "Failed to update repository",
      enabled ? "Repository enabled" : "Repository paused"
    );
    await queryClient.invalidateQueries({
      queryKey: dashboardOrpc.github.app.get.queryKey({
        input: { organizationId },
      }),
    });
  };

  const removeRepository = async (repositoryId: string) => {
    const transaction = collection.delete(repositoryId);
    await persist(
      repositoryId,
      transaction,
      "Failed to remove repository",
      "Repository removed"
    );
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
    removeRepository,
  };
}
