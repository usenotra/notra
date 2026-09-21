"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { dashboardOrpc } from "@/lib/orpc/query";
import type { UseGitHubRepositorySelectionOptions } from "@/types/integrations/github";

const GITHUB_CATALOG_STALE_TIME_MS = 15 * 60 * 1000;

export function useGitHubRepositorySelection({
  organizationId,
  enabled = true,
  loadCatalog = enabled,
  refetchOnMount = true,
  initialAccountId = null,
  onSaved,
}: UseGitHubRepositorySelectionOptions) {
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId);
  const query = useQuery(
    dashboardOrpc.github.app.get.queryOptions({
      input: { organizationId },
      enabled: !!organizationId && enabled,
      staleTime: 5 * 60 * 1000,
      refetchOnMount,
    })
  );
  const catalogQuery = useQuery(
    dashboardOrpc.github.app.catalog.queryOptions({
      input: { organizationId },
      enabled: !!organizationId && enabled && loadCatalog,
      retry: false,
      staleTime: GITHUB_CATALOG_STALE_TIME_MS,
      refetchOnMount,
    })
  );
  const accounts = (query.data?.accounts ?? []).map((account) => {
    const live = catalogQuery.data?.accounts.find(
      (candidate) => candidate.id === account.id
    );
    return live ? { ...account, canPublish: live.canPublish } : account;
  });
  const accountId = selectedAccountId ?? accounts[0]?.id;
  const account = accounts.find((candidate) => candidate.id === accountId);
  const repositories = query.data?.repositories ?? [];
  const dialogRepositories = account
    ? (catalogQuery.data?.repositories ?? []).filter(
        (repository) =>
          repository.owner.toLowerCase() === account.login.toLowerCase()
      )
    : [];
  const saveMutation = useMutation({
    mutationFn: (repositoryIds: string[]) =>
      dashboardOrpc.github.app.saveRepositories.call({
        organizationId,
        repositoryIds,
      }),
    onSuccess: async (_saved, repositoryIds) => {
      queryClient.setQueryData(
        dashboardOrpc.github.app.get.queryKey({
          input: { organizationId },
        }),
        (current) =>
          current
            ? { ...current, selectedRepositoryIds: repositoryIds }
            : current
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.github.app.get.queryKey({
            input: { organizationId },
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.integrations.key(),
        }),
      ]);
      onSaved();
      toast.success("GitHub repositories saved");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to save GitHub repositories"),
  });
  return {
    query,
    accounts,
    accountId,
    setSelectedAccountId,
    dialogRepositories,
    repositories,
    selectedRepositoryIds: query.data?.selectedRepositoryIds ?? [],
    catalogQuery,
    saveMutation,
  };
}
