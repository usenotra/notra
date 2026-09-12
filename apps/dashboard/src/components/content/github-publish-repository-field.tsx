"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@notra/ui/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import Link from "next/link";

import { Button } from "@/components/button";
import type {
  GitHubPublishRepositoryFieldProps,
  GitHubPublishRepositoryStatusProps,
} from "@/types/content/detail";
import { formatGitHubRepositoryLabel } from "@/utils/github-publish-repositories";

function GitHubPublishRepositoryStatus({
  connectedRepositoryCount,
  contentTypeLabel,
  githubIntegrationHref,
  integrationsLoadFailed,
  isLoadingIntegrations,
  onRetryIntegrations,
  repositoriesCount,
  selectedPublishingEnabled,
  selectedRepository,
}: GitHubPublishRepositoryStatusProps) {
  if (integrationsLoadFailed) {
    return (
      <div
        className="border-destructive/30 flex items-center justify-between gap-3 rounded-lg border p-3"
        role="alert"
      >
        <p className="text-destructive text-sm">
          Unable to load GitHub repositories.
        </p>
        <Button
          onClick={onRetryIntegrations}
          size="sm"
          type="button"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (isLoadingIntegrations) {
    return null;
  }

  if (connectedRepositoryCount === 0) {
    return (
      <FieldDescription>
        No enabled GitHub repositories are connected. Open the{" "}
        <Link
          className="underline underline-offset-4"
          href={githubIntegrationHref}
        >
          GitHub integration
        </Link>{" "}
        to connect or enable one.
      </FieldDescription>
    );
  }

  if (selectedRepository && !selectedPublishingEnabled) {
    return (
      <FieldDescription>
        {contentTypeLabel} publishing is off for this repository. Open the{" "}
        <Link
          className="underline underline-offset-4"
          href={githubIntegrationHref}
        >
          GitHub integration
        </Link>{" "}
        to enable it.
      </FieldDescription>
    );
  }

  if (repositoriesCount === 0) {
    return (
      <FieldDescription>
        These repositories need a default branch before they can publish to
        GitHub.
      </FieldDescription>
    );
  }

  return null;
}

export function GitHubPublishRepositoryField({
  connectedRepositoryCount,
  contentLabel,
  integrationsLoadFailed,
  isLoadingIntegrations,
  isPublishing,
  onRepositoryChange,
  onRetryIntegrations,
  organizationSlug,
  repositories,
  selectedPublishingEnabled,
  selectedRepository,
}: GitHubPublishRepositoryFieldProps) {
  const githubIntegrationHref = `/${organizationSlug}/integrations/github`;
  const contentTypeLabel =
    contentLabel === "blog post" ? "Blog post" : "Changelog";

  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor="github-publish-repository">Repository</FieldLabel>
        <Select
          disabled={
            isPublishing || integrationsLoadFailed || repositories.length === 0
          }
          onValueChange={(value) => onRepositoryChange(value ?? "")}
          value={selectedRepository?.id ?? ""}
        >
          <SelectTrigger className="w-full" id="github-publish-repository">
            <SelectValue
              placeholder={
                isLoadingIntegrations
                  ? "Loading repositories…"
                  : "Select a repository"
              }
            >
              {(value) => {
                const repository =
                  repositories.find((candidate) => candidate.id === value) ??
                  selectedRepository;
                if (!repository) {
                  return "Select a repository";
                }
                return formatGitHubRepositoryLabel(repository);
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {repositories.map((repository) => (
              <SelectItem key={repository.id} value={repository.id}>
                {formatGitHubRepositoryLabel(repository)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <GitHubPublishRepositoryStatus
          connectedRepositoryCount={connectedRepositoryCount}
          contentTypeLabel={contentTypeLabel}
          githubIntegrationHref={githubIntegrationHref}
          integrationsLoadFailed={integrationsLoadFailed}
          isLoadingIntegrations={isLoadingIntegrations}
          onRetryIntegrations={onRetryIntegrations}
          repositoriesCount={repositories.length}
          selectedPublishingEnabled={selectedPublishingEnabled}
          selectedRepository={selectedRepository}
        />
      </Field>
    </div>
  );
}
