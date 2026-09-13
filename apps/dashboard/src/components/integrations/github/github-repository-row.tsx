"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { useState } from "react";

import type { GitHubRepositoryRowProps } from "@/types/integrations/github";

import { GitHubPublishingSettings } from "./github-publishing-settings";
import { GitHubRepositoryActions } from "./github-repository-actions";
import { GitHubWebhookSettings } from "./github-webhook-settings";

export function GitHubRepositoryRow({
  integration,
  organizationId,
  onMigrate,
  isMigrating,
  onManageRepositories,
}: GitHubRepositoryRowProps) {
  const [webhooksOpen, setWebhooksOpen] = useState(false);
  const legacy = !integration.managedByGitHubApp;
  const primaryRepository = integration.repositories[0];
  return (
    <Collapsible
      className="group/repo border-border bg-muted scroll-mt-24 rounded-2xl border"
      defaultOpen
      id={`repository-${integration.id}`}
      render={<article />}
    >
      <CollapsibleTrigger
        className="group/header flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left group-data-open/repo:pb-9 [&_[data-chevron]]:transition-transform [&[data-panel-open]_[data-chevron]]:rotate-180"
        nativeButton={false}
        render={<div />}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="text-muted-foreground group-hover/header:bg-muted group-hover/header:text-foreground dark:group-hover/header:bg-muted/50 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors">
            <HugeiconsIcon
              className="size-4"
              data-chevron
              icon={ArrowDown01Icon}
            />
          </span>
          <div className="bg-background flex size-9 shrink-0 items-center justify-center rounded-lg border">
            <Github className="size-4" />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-medium">
              {primaryRepository ? (
                <a
                  className="underline-offset-4 hover:underline"
                  onClick={(event) => event.stopPropagation()}
                  href={`https://github.com/${encodeURIComponent(primaryRepository.owner)}/${encodeURIComponent(primaryRepository.repo)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="text-muted-foreground font-normal">
                    {primaryRepository.owner}/
                  </span>
                  {primaryRepository.repo}
                </a>
              ) : (
                integration.displayName
              )}
            </h3>
            {primaryRepository?.defaultBranch ? (
              <span className="text-muted-foreground text-xs">
                · {primaryRepository.defaultBranch}
              </span>
            ) : null}
          </div>
        </div>
        <div
          className="flex items-center"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role="presentation"
        >
          <GitHubRepositoryActions
            onMigrate={() => onMigrate(integration)}
            isMigrating={isMigrating}
            onToggleWebhooks={() => setWebhooksOpen(!webhooksOpen)}
            webhooksOpen={webhooksOpen}
            integration={integration}
            organizationId={organizationId}
            onManageRepositories={onManageRepositories}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border bg-background -mx-px -mt-5 -mb-px min-w-0 space-y-3 rounded-2xl border p-5">
        {integration.repositories.map((repository) => (
          <div key={repository.id}>
            {integration.repositories.length > 1 ? (
              <h4 className="mb-2 text-sm font-medium">
                {repository.owner}/{repository.repo}
              </h4>
            ) : null}
            <GitHubPublishingSettings
              repository={repository}
              organizationId={organizationId}
              disabled={!integration.enabled || !repository.enabled}
            />
          </div>
        ))}
        {integration.repositories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No repository configured. Choose Edit repository from the menu to
            finish setup.
          </p>
        ) : null}
        {legacy && integration.repositories.length > 0 ? (
          <div id={`webhooks-${integration.id}`} hidden={!webhooksOpen}>
            {webhooksOpen ? (
              <div className="space-y-5 pt-2">
                {integration.repositories.map((repository) => (
                  <GitHubWebhookSettings
                    key={repository.id}
                    repository={repository}
                    organizationId={organizationId}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
