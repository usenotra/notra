import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { GitHubIntegrationSkeleton } from "@/app/(dashboard)/[slug]/integrations/github/skeleton";
import { Button } from "@/components/button";
import { GitHubAccountCard } from "@/components/integrations/github/github-account-card";
import type { GitHubAppSectionProps } from "@/types/integrations/github-settings";

function GitHubAccounts({
  githubAppQuery,
  isLoading,
  isConnected,
  accounts,
  repositories,
  selectedRepositoryIds,
  disconnectMutation,
  handleOpenRepositories,
  handleOpenConnect,
  setLegacyOpen,
}: GitHubAppSectionProps) {
  if (isLoading) {
    return <GitHubIntegrationSkeleton />;
  }
  if (githubAppQuery.isError && !githubAppQuery.data) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 border-b pb-5"
      >
        <p className="text-sm">Unable to load GitHub accounts.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => githubAppQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }
  if (isConnected) {
    return (
      <section
        aria-label="Connected GitHub accounts"
        className="bg-muted/40 grid gap-2 rounded-2xl px-5 py-2"
      >
        {accounts.map((account) => (
          <GitHubAccountCard
            account={account}
            key={account.id}
            isDisconnecting={disconnectMutation.isPending}
            onAddRepositories={() => handleOpenRepositories(account.id)}
            onDisconnect={() => disconnectMutation.mutate(account.id)}
            repositories={repositories.filter(
              (repository) =>
                repository.owner.toLowerCase() === account.login.toLowerCase()
            )}
            selectedRepositoryIds={selectedRepositoryIds}
          />
        ))}
      </section>
    );
  }
  return (
    <div className="bg-muted/40 space-y-3 rounded-2xl p-5">
      <h3 className="text-sm font-medium">Connect the GitHub App</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Add repositories without managing a personal access token.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={handleOpenConnect}>
          Connect GitHub
        </Button>
        <Button variant="ghost" onClick={() => setLegacyOpen(true)}>
          Connect with access token
        </Button>
      </div>
    </div>
  );
}

export function GitHubAppSection(props: GitHubAppSectionProps) {
  const {
    githubAppQuery,
    isLoading,
    isLoadingLegacyIntegrations,
    isConnected,
    handleOpenConnect,
    setLegacyOpen,
  } = props;
  const hasAccountContent =
    isLoading ||
    (githubAppQuery.isError && !githubAppQuery.data) ||
    isConnected;
  if (!hasAccountContent && isLoadingLegacyIntegrations) {
    return null;
  }
  return (
    <section
      aria-labelledby="github-app-heading"
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-12"
    >
      <div className="space-y-1">
        <h2 id="github-app-heading" className="text-base font-semibold">
          GitHub App
        </h2>
        <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
          Manage connected accounts and repository access.
        </p>
      </div>
      <div className="min-w-0 space-y-4">
        <GitHubAccounts {...props} />
        {isConnected ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleOpenConnect}>
              <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
              Add GitHub account
            </Button>
            <Button variant="ghost" onClick={() => setLegacyOpen(true)}>
              Connect with access token
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
