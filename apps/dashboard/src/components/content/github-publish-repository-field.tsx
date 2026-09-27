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
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

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
  const t = useTranslations("content.githubPublish");
  const tCommon = useTranslations("common.actions");
  const renderLink = (chunks: ReactNode) => (
    <Link className="underline underline-offset-4" href={githubIntegrationHref}>
      {chunks}
    </Link>
  );
  if (integrationsLoadFailed) {
    return (
      <div
        className="border-destructive/30 flex items-center justify-between gap-3 rounded-lg border p-3"
        role="alert"
      >
        <p className="text-destructive text-sm">{t("loadFailed")}</p>
        <Button
          onClick={onRetryIntegrations}
          size="sm"
          type="button"
          variant="outline"
        >
          {tCommon("retry")}
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
        {t.rich("noConnected", { link: renderLink })}
      </FieldDescription>
    );
  }

  if (selectedRepository && !selectedPublishingEnabled) {
    return (
      <FieldDescription>
        {t.rich("publishingOff", { kind: contentTypeLabel, link: renderLink })}
      </FieldDescription>
    );
  }

  if (repositoriesCount === 0) {
    return <FieldDescription>{t("needsDefaultBranch")}</FieldDescription>;
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
  const t = useTranslations("content.githubPublish");
  const tCommon2 = useTranslations("common");
  const githubIntegrationHref = `/${organizationSlug}/integrations/github`;

  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor="github-publish-repository">
          {tCommon2("labels.repository")}
        </FieldLabel>
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
                  ? t("loadingRepositories")
                  : t("selectRepository")
              }
            >
              {(value) => {
                const repository =
                  repositories.find((candidate) => candidate.id === value) ??
                  selectedRepository;
                if (!repository) {
                  return t("selectRepository");
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
          contentTypeLabel={contentLabel}
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
