import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useGitHubCallbackErrorToast,
  useResumeGitHubInstall,
} from "@/hooks/use-github-install-callbacks";
import { useGitHubRepositoryMigration } from "@/hooks/use-github-repository-migration";
import { useGitHubRepositorySelection } from "@/hooks/use-github-repository-selection";
import { useGitHubRepositoriesDb } from "@/lib/hooks/use-github-repositories-db";
import { startGitHubInstall } from "@/lib/integrations/github/install";
import { dashboardOrpc } from "@/lib/orpc/query";

export function useGitHubSettings(organizationSlug: string) {
  const { getOrganization, isLoading: isLoadingOrganizations } =
    useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const organizationId = organization?.id ?? "";
  const pathname = usePathname();
  const [{ githubConnected, githubAccountId }, setCallbackParams] =
    useQueryStates(
      { githubConnected: parseAsBoolean, githubAccountId: parseAsString },
      { history: "replace" }
    );
  const queryClient = useQueryClient();
  const [connectOpen, setConnectOpen] = useState(false);
  const [reposOpen, setReposOpen] = useState(() => githubConnected === true);
  const [legacyOpen, setLegacyOpen] = useState(false);
  useResumeGitHubInstall({ callbackPath: pathname, organizationId });
  useGitHubCallbackErrorToast();
  const {
    query: githubAppQuery,
    catalogQuery,
    accounts,
    accountId: dialogAccountId,
    setSelectedAccountId: setSelectedDialogAccountId,
    dialogRepositories,
    repositories,
    selectedRepositoryIds,
    saveMutation: saveRepositoriesMutation,
  } = useGitHubRepositorySelection({
    organizationId,
    loadCatalog: reposOpen,
    refetchOnMount: false,
    initialAccountId: githubAccountId,
    onSaved: () => setReposOpen(false),
  });
  const repositoriesDb = useGitHubRepositoriesDb(organizationId);
  const githubIntegrations = repositoriesDb.repositories;
  const isConnected = accounts.length > 0;
  const isLoading =
    isLoadingOrganizations ||
    (!!organizationId && githubAppQuery.isLoading && !githubAppQuery.data);
  const isLoadingLegacyIntegrations =
    isLoadingOrganizations ||
    (!!organizationId && repositoriesDb.isLoading && !repositoriesDb.hasData);
  useEffect(() => {
    if (!githubConnected || !organization?.id) {
      return;
    }
    void setCallbackParams({ githubConnected: null, githubAccountId: null });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.github.app.get.queryKey({
        input: { organizationId: organization.id },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.github.app.catalog.queryKey({
        input: { organizationId: organization.id },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.integrations.key(),
    });
  }, [githubConnected, setCallbackParams, organization?.id, queryClient]);
  const startInstall = async () => {
    if (!organizationId) {
      return;
    }
    const callbackPath = pathname || `/${organizationSlug}/integrations/github`;
    const result = await startGitHubInstall({ organizationId, callbackPath });
    if (!result.started) {
      toast.error("Failed to start GitHub install");
    }
  };
  const migrationMutation = useGitHubRepositoryMigration(
    organizationId,
    startInstall
  );
  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) =>
      dashboardOrpc.github.app.disconnect.call({ organizationId, accountId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.github.app.get.queryKey({
            input: { organizationId },
          }),
        }),
        queryClient.removeQueries({
          queryKey: dashboardOrpc.github.app.catalog.queryKey({
            input: { organizationId },
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.integrations.key(),
        }),
      ]);
      toast.success("GitHub disconnected");
    },
    onError: () => toast.error("Failed to disconnect GitHub"),
  });
  const handleOpenConnect = () => setConnectOpen(true);
  const handleOpenRepositories = (accountId?: string) => {
    setSelectedDialogAccountId(accountId ?? null);
    setReposOpen(true);
  };
  useHotkey(
    "C",
    () => (isConnected ? handleOpenRepositories() : handleOpenConnect()),
    { enabled: !!organizationId }
  );
  return {
    organizationId,
    connectOpen,
    setConnectOpen,
    reposOpen,
    setReposOpen,
    legacyOpen,
    setLegacyOpen,
    githubAppQuery,
    catalogQuery,
    accounts,
    dialogAccountId,
    setSelectedDialogAccountId,
    dialogRepositories,
    repositories,
    selectedRepositoryIds,
    saveRepositoriesMutation,
    repositoriesDb,
    githubIntegrations,
    isConnected,
    isLoading,
    isLoadingLegacyIntegrations,
    migrationMutation,
    disconnectMutation,
    startInstall,
    handleOpenConnect,
    handleOpenRepositories,
  };
}
