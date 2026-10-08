"use client";

import { GITHUB_PUBLISH_CONTENT_TYPES } from "@notra/schemas/constants/dashboard/github";
import { useQuery } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  GitHubPublishRepositorySelectionFieldProps,
  GitHubPublishRepositorySelectionOptions,
} from "@/types/content/detail";
import {
  getGitHubPublishRepositoryLists,
  isGitHubContentPublishingEnabled,
  resolveGitHubPublishRepositoryId,
} from "@/utils/github-publish-repositories";

const INTEGRATIONS_STALE_MS = 5 * 60 * 1000;

/**
 * The GitHub repositories a post can be published to, and which one is
 * selected. Shared by the publish and the schedule dialogs.
 */
export function useGitHubPublishRepositorySelection({
  organizationId,
  contentType,
  repositoryId,
  enabled,
}: GitHubPublishRepositorySelectionOptions) {
  const integrationsQuery = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId },
      enabled,
      staleTime: INTEGRATIONS_STALE_MS,
    })
  );
  const { connected, publishable: repositories } =
    getGitHubPublishRepositoryLists(integrationsQuery.data?.integrations ?? []);
  const selectedRepositoryId = resolveGitHubPublishRepositoryId(
    repositoryId,
    repositories
  );
  const selectedRepository = repositories.find(
    (repository) => repository.id === selectedRepositoryId
  );
  const publishContentType = GITHUB_PUBLISH_CONTENT_TYPES.find(
    (type) => type === contentType
  );
  const selectedPublishingEnabled =
    selectedRepository && publishContentType
      ? isGitHubContentPublishingEnabled(selectedRepository, publishContentType)
      : false;

  const fieldProps: GitHubPublishRepositorySelectionFieldProps = {
    connectedRepositoryCount: connected.length,
    contentLabel: contentType === "changelog" ? "changelog" : "blog post",
    integrationsLoadFailed:
      integrationsQuery.isError && !integrationsQuery.data,
    isLoadingIntegrations: integrationsQuery.isLoading,
    onRetryIntegrations: () => {
      void integrationsQuery.refetch();
    },
    repositories,
    selectedPublishingEnabled,
    selectedRepository,
  };

  return {
    repositories,
    selectedRepositoryId,
    selectedRepository,
    selectedPublishingEnabled,
    fieldProps,
  };
}
