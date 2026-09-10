"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { dashboardOrpc } from "@/lib/orpc/query";
import type { UseGitHubRepositorySelectionOptions } from "@/types/integrations/github";

export function useGitHubRepositorySelection({
  organizationId,
  enabled = true,
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
  const accounts = query.data?.accounts ?? [];
  const accountId = selectedAccountId ?? accounts[0]?.id;
  const account = accounts.find((candidate) => candidate.id === accountId);
  const repositories = query.data?.repositories ?? [];
  const dialogRepositories = account
    ? repositories.filter(
        (repository) =>
          repository.owner.toLowerCase() === account.login.toLowerCase()
      )
    : repositories;
  const saveMutation = useMutation({
    mutationFn: (repositoryIds: string[]) =>
      dashboardOrpc.github.app.saveRepositories.call({
        organizationId,
        repositoryIds,
      }),
    onSuccess: async () => {
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
    saveMutation,
  };
}
