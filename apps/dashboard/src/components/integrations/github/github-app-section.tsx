import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { GitHubIntegrationSkeleton } from "@/app/(dashboard)/[slug]/integrations/github/skeleton";
import { Button } from "@/components/button";
import { GitHubAccountCard } from "@/components/integrations/github/github-account-card";
import type { GitHubAppSectionProps } from "@/types/integrations/github-settings";

function GitHubAccounts({
  githubAppQuery,
  isLoading,
  isLoadingLegacyIntegrations,
  isConnected,
  accounts,
  repositories,
  selectedRepositoryIds,
  disconnectMutation,
  handleOpenRepositories,
  handleOpenConnect,
  setLegacyOpen,
}: GitHubAppSectionProps) {
  const t = useTranslations("integrations.github.appSection");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");

  if (githubAppQuery.isError && !githubAppQuery.data) {
    return (
      <div
        role="alert"
        className="flex min-h-36 flex-col items-center justify-center gap-3 px-5 py-6 text-center"
      >
        <p className="text-muted-foreground text-sm">{t("loadFailed")}</p>
        <Button
          disabled={githubAppQuery.isFetching}
          variant="outline"
          size="sm"
          onClick={() => githubAppQuery.refetch()}
        >
          {githubAppQuery.isFetching
            ? tCommon("labels.retrying")
            : tCommon("actions.retry")}
        </Button>
      </div>
    );
  }
  if (isLoading) {
    return <GitHubIntegrationSkeleton />;
  }
  if (isConnected) {
    return (
      <section
        aria-label={t("connectedAccounts")}
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
  if (isLoadingLegacyIntegrations) {
    return <GitHubIntegrationSkeleton />;
  }
  return (
    <div className="bg-muted/40 space-y-3 rounded-2xl p-5">
      <h3 className="text-sm font-medium">{t("connectTitle")}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={handleOpenConnect}>
          {tIntegrationsShared("connectGithub")}
        </Button>
        <Button variant="ghost" onClick={() => setLegacyOpen(true)}>
          {t("connectWithToken")}
        </Button>
      </div>
    </div>
  );
}

export function GitHubAppSection(props: GitHubAppSectionProps) {
  const t = useTranslations("integrations.github.appSection");
  const tIntegrationsShared2 = useTranslations("integrations.shared");
  const { isConnected, handleOpenConnect, setLegacyOpen } = props;
  return (
    <section
      aria-labelledby="github-app-heading"
      className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] 2xl:gap-12"
    >
      <div className="space-y-1">
        <h2 id="github-app-heading" className="text-base font-semibold">
          {t("title")}
        </h2>
      </div>
      <div className="min-w-0 space-y-4">
        <GitHubAccounts {...props} />
        {isConnected ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleOpenConnect}>
              <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
              {tIntegrationsShared2("addGithubAccount")}
            </Button>
            <Button variant="ghost" onClick={() => setLegacyOpen(true)}>
              {t("connectWithToken")}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
