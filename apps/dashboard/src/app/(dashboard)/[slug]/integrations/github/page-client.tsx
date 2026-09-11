"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";

import { Button } from "@/components/button";
import { ConnectGitHubDialog } from "@/components/integrations/github/connect-github-dialog";
import { GitHubAppSection } from "@/components/integrations/github/github-app-section";
import { GitHubRepositoriesSection } from "@/components/integrations/github/github-repositories-section";
import { SelectRepositoriesDialog } from "@/components/integrations/github/select-repositories-dialog";
import { LegacyAddIntegrationDialog } from "@/components/integrations/legacy/add-integration-dialog";
import { PageContainer } from "@/components/layout/container";
import { useGitHubSettings } from "@/hooks/use-github-settings";
import type { GitHubSettingsPageProps } from "@/types/integrations/github-settings";

export default function PageClient({
  organizationSlug,
}: GitHubSettingsPageProps) {
  const settings = useGitHubSettings(organizationSlug);
  const {
    githubIntegrations,
    isConnected,
    handleOpenRepositories,
    handleOpenConnect,
    githubAppQuery,
  } = settings;
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-10 px-4 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">GitHub</h1>
            <p className="text-muted-foreground">
              Manage repository access and where Notra publishes draft pull
              requests.
            </p>
          </div>
          {githubIntegrations.length > 0 ? (
            <Button
              className="gap-1.5"
              onClick={
                isConnected ? () => handleOpenRepositories() : handleOpenConnect
              }
            >
              <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
              {isConnected ? "Add repositories" : "Connect GitHub"}
              <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
            </Button>
          ) : null}
        </div>
        <GitHubRepositoriesSection {...settings} />
        <GitHubAppSection {...settings} />
      </div>
      <ConnectGitHubDialog
        isConnecting={false}
        onConnect={settings.startInstall}
        onOpenChange={settings.setConnectOpen}
        open={settings.connectOpen}
      />
      <SelectRepositoriesDialog
        accounts={settings.accounts}
        initialSelected={settings.selectedRepositoryIds}
        isLoading={githubAppQuery.isPending || githubAppQuery.isFetching}
        error={
          githubAppQuery.isError
            ? "Unable to load repositories from GitHub."
            : undefined
        }
        onRetry={() => githubAppQuery.refetch()}
        isSaving={settings.saveRepositoriesMutation.isPending}
        onAddAccount={settings.startInstall}
        onOpenChange={settings.setReposOpen}
        onSave={(repositoryIds) =>
          settings.saveRepositoriesMutation.mutate(repositoryIds)
        }
        onSelectAccount={settings.setSelectedDialogAccountId}
        open={settings.reposOpen}
        repositories={settings.dialogRepositories}
        selectedAccountId={settings.dialogAccountId}
      />
      <LegacyAddIntegrationDialog
        onOpenChange={settings.setLegacyOpen}
        onSuccess={() => settings.legacyQuery.refetch()}
        open={settings.legacyOpen}
        organizationId={settings.organizationId}
        organizationSlug={organizationSlug}
      />
    </PageContainer>
  );
}
