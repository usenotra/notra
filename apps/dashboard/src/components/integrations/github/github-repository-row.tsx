"use client";

import { Badge } from "@notra/ui/components/ui/badge";
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
    <article
      className="bg-muted/40 grid scroll-mt-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-5 rounded-2xl p-5"
      id={`repository-${integration.id}`}
    >
      <div className="contents">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Github className="size-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-sm font-medium">
              {primaryRepository ? (
                <a
                  className="underline-offset-4 hover:underline"
                  href={`https://github.com/${encodeURIComponent(primaryRepository.owner)}/${encodeURIComponent(primaryRepository.repo)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {primaryRepository.repo}
                </a>
              ) : (
                integration.displayName
              )}
            </h3>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <span>{primaryRepository?.owner}</span>
              <span>· {legacy ? "Token" : "App"}</span>
              {primaryRepository?.defaultBranch ? (
                <span>· {primaryRepository.defaultBranch}</span>
              ) : null}
              {!integration.enabled ||
              integration.repositories.some(
                (repository) => !repository.enabled
              ) ? (
                <Badge variant="secondary">Paused</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div>
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
      </div>
      <div className="col-span-2 min-w-0 space-y-3">
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
      </div>
      {integration.repositories.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No repository configured. Choose Edit repository from the menu to
          finish setup.
        </p>
      ) : null}
      {legacy && integration.repositories.length > 0 ? (
        <div className="col-span-full" hidden={!webhooksOpen}>
          <div id={`webhooks-${integration.id}`} hidden={!webhooksOpen}>
            {webhooksOpen ? (
              <div className="space-y-5 pt-4">
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
        </div>
      ) : null}
    </article>
  );
}
