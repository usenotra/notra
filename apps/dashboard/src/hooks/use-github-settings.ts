import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useGitHubCallbackErrorToast,
  useResumeGitHubInstall,
} from "@/hooks/use-github-install-callbacks";
import { useGitHubRepositoryMigration } from "@/hooks/use-github-repository-migration";
import { useGitHubRepositorySelection } from "@/hooks/use-github-repository-selection";
import { startGitHubInstall } from "@/lib/integrations/github/install";
import { dashboardOrpc } from "@/lib/orpc/query";

export function useGitHubSettings(organizationSlug: string) {
  const { getOrganization, isLoading: isLoadingOrganizations } =
    useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const organizationId = organization?.id ?? "";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [connectOpen, setConnectOpen] = useState(false);
  const [reposOpen, setReposOpen] = useState(
    () => searchParams.get("githubConnected") === "true"
  );
  const [legacyOpen, setLegacyOpen] = useState(false);
  useResumeGitHubInstall({
    callbackPath: pathname,
    organizationId,
    reauthorizationInstallationId: searchParams.get(
      "githubReauthorizeInstallationId"
    ),
    reauthorizationState: searchParams.get("githubReauthorizeState"),
    shouldResume: searchParams.get("githubAccountConnected") === "true",
  });
  useGitHubCallbackErrorToast(searchParams.get("githubError"));
  const {
    query: githubAppQuery,
    accounts,
    accountId: dialogAccountId,
    setSelectedAccountId: setSelectedDialogAccountId,
    dialogRepositories,
    repositories,
    selectedRepositoryIds,
    saveMutation: saveRepositoriesMutation,
  } = useGitHubRepositorySelection({
    organizationId,
    refetchOnMount: false,
    initialAccountId: searchParams.get("githubAccountId"),
    onSaved: () => setReposOpen(false),
  });
  const legacyQuery = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId,
    })
  );
  const githubIntegrations =
    legacyQuery.data?.integrations.filter(
      (integration) => integration.type === "github"
    ) ?? [];
  const isConnected = accounts.length > 0;
  const isLoading =
    isLoadingOrganizations ||
    (!!organizationId && githubAppQuery.isLoading && !githubAppQuery.data);
  const isLoadingLegacyIntegrations =
    isLoadingOrganizations ||
    (!!organizationId && legacyQuery.isLoading && !legacyQuery.data);
  useEffect(() => {
    if (searchParams.get("githubConnected") !== "true" || !organization?.id) {
      return;
    }
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("githubConnected");
    nextUrl.searchParams.delete("githubAccountId");
    window.history.replaceState(null, "", nextUrl);
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.github.app.get.queryKey({
        input: { organizationId: organization.id },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.integrations.key(),
    });
  }, [searchParams, organization?.id, queryClient]);
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
    githubAppQuery.refetch,
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
    accounts,
    dialogAccountId,
    setSelectedDialogAccountId,
    dialogRepositories,
    repositories,
    selectedRepositoryIds,
    saveRepositoriesMutation,
    legacyQuery,
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
