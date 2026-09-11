"use client";

import { toast } from "sonner";

import { useGitHubRepositorySelection } from "@/hooks/use-github-repository-selection";
import { startGitHubInstall } from "@/lib/integrations/github/install";
import type { GitHubIntegrationDialogProps } from "@/types/integrations/github";

import { ConnectGitHubDialog } from "./connect-github-dialog";
import { SelectRepositoriesDialog } from "./select-repositories-dialog";

export function GitHubIntegrationDialog({
  organizationId,
  organizationSlug,
  open,
  onOpenChange,
}: GitHubIntegrationDialogProps) {
  const {
    query: githubAppQuery,
    accounts,
    accountId: dialogAccountId,
    setSelectedAccountId,
    dialogRepositories,
    selectedRepositoryIds,
    saveMutation: saveRepositoriesMutation,
  } = useGitHubRepositorySelection({
    organizationId,
    enabled: open,
    onSaved: () => onOpenChange(false),
  });
  const isConnected = accounts.length > 0;

  const openInstall = async () => {
    if (!organizationId) {
      return;
    }

    const callbackPath = `/${organizationSlug}/integrations/github`;
    const result = await startGitHubInstall({ organizationId, callbackPath });

    if (!result.started) {
      toast.error("Failed to start GitHub install");
    }
  };

  if (isConnected || githubAppQuery.isPending || githubAppQuery.isError) {
    return (
      <SelectRepositoriesDialog
        accounts={accounts}
        initialSelected={selectedRepositoryIds}
        isLoading={githubAppQuery.isPending || githubAppQuery.isFetching}
        error={
          githubAppQuery.isError
            ? "Unable to load repositories from GitHub."
            : undefined
        }
        onRetry={() => githubAppQuery.refetch()}
        isSaving={saveRepositoriesMutation.isPending}
        onAddAccount={openInstall}
        onOpenChange={onOpenChange}
        onSave={(repositoryIds) =>
          saveRepositoriesMutation.mutate(repositoryIds)
        }
        onSelectAccount={setSelectedAccountId}
        open={open}
        repositories={dialogRepositories}
        selectedAccountId={dialogAccountId}
      />
    );
  }

  return (
    <ConnectGitHubDialog
      onConnect={openInstall}
      onOpenChange={onOpenChange}
      open={open}
    />
  );
}
