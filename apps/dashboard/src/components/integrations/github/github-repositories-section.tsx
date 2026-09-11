import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { GitHubRepositoriesSkeleton } from "@/app/(dashboard)/[slug]/integrations/github/skeleton";
import { Button } from "@/components/button";
import { GitHubRepositoryPreview } from "@/components/integrations/github/github-repository-preview";
import { GitHubRepositoryRow } from "@/components/integrations/github/github-repository-row";
import { useRepositoryHashScroll } from "@/hooks/use-repository-hash-scroll";
import type { GitHubRepositoriesSectionProps } from "@/types/integrations/github-settings";

function RepositoryList({
  githubIntegrations,
  organizationId,
  isLoadingLegacyIntegrations,
  legacyQuery,
  handleOpenRepositories,
  handleOpenConnect,
  isConnected,
  migrationMutation,
}: GitHubRepositoriesSectionProps) {
  if (isLoadingLegacyIntegrations) {
    return <GitHubRepositoriesSkeleton />;
  }
  if (legacyQuery.isError && !legacyQuery.data) {
    return (
      <div role="alert" className="py-6">
        <p className="text-sm">Unable to load repositories.</p>
        <Button
          className="mt-2"
          variant="outline"
          onClick={() => legacyQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }
  if (githubIntegrations.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-10 text-center sm:py-14">
        <GitHubRepositoryPreview />
        <div className="mt-2 max-w-sm space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">
            Connect your first repository
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Add a repository to turn your updates into changelogs and blog
            posts, delivered as draft pull requests.
          </p>
        </div>
        <Button
          className="mt-5 gap-1.5"
          onClick={
            isConnected ? () => handleOpenRepositories() : handleOpenConnect
          }
        >
          <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
          {isConnected ? "Add repositories" : "Connect GitHub"}
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {githubIntegrations.map((integration) => (
        <GitHubRepositoryRow
          integration={integration}
          key={integration.id}
          organizationId={organizationId}
          onManageRepositories={() => handleOpenRepositories()}
          onMigrate={(target) => migrationMutation.mutate(target)}
          isMigrating={
            migrationMutation.isPending &&
            migrationMutation.variables?.id === integration.id
          }
        />
      ))}
    </div>
  );
}

export function GitHubRepositoriesSection(
  props: GitHubRepositoriesSectionProps
) {
  const { githubIntegrations, isLoadingLegacyIntegrations, legacyQuery } =
    props;
  useRepositoryHashScroll(legacyQuery.data);
  const empty =
    !isLoadingLegacyIntegrations &&
    !legacyQuery.isError &&
    githubIntegrations.length === 0;
  return (
    <section
      aria-labelledby="github-repositories-heading"
      className={
        githubIntegrations.length > 0
          ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-12"
          : ""
      }
    >
      <div className={`space-y-1 pb-2 ${empty ? "sr-only" : ""}`}>
        <h2
          className="text-base font-semibold"
          id="github-repositories-heading"
        >
          Repositories{" "}
          <span className="text-muted-foreground bg-muted ml-1 rounded-md px-1.5 py-0.5 text-xs font-normal tabular-nums">
            {githubIntegrations.length}
          </span>
        </h2>
        <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
          Choose what each repository publishes and where draft pull requests
          are saved.
        </p>
      </div>
      <div className="min-w-0 space-y-4">
        {legacyQuery.isError && legacyQuery.data ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 text-sm"
          >
            <p>Unable to refresh repositories. Showing the last loaded data.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => legacyQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}
        <RepositoryList {...props} />
      </div>
    </section>
  );
}
