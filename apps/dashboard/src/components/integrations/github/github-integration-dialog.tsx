"use client";

import { toast } from "sonner";
import { useTranslations } from "use-intl";

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
  const t = useTranslations("integrations.github");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const {
    query: githubAppQuery,
    catalogQuery,
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
      toast.error(result.message ?? t("toasts.installFailed"));
    }
  };

  if (isConnected || githubAppQuery.isPending || githubAppQuery.isError) {
    return (
      <SelectRepositoriesDialog
        accounts={accounts}
        initialSelected={selectedRepositoryIds}
        isLoading={
          !catalogQuery.data &&
          (catalogQuery.isPending || catalogQuery.isFetching)
        }
        error={
          catalogQuery.isError && !catalogQuery.data
            ? tIntegrationsShared("unableToLoadRepositoriesFrom")
            : undefined
        }
        onRetry={() => catalogQuery.refetch()}
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
