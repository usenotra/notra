"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { GitHubPublishDialogFooter } from "@/components/content/github-publish-dialog-footer";
import { GitHubPublishRecoveryAlert } from "@/components/content/github-publish-recovery-alert";
import { GitHubPublishRepositoryField } from "@/components/content/github-publish-repository-field";
import { GitHubPublishResultCard } from "@/components/content/github-publish-result-card";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  GitHubPublishDialogBodyProps,
  PublishContentToGitHubDialogProps,
} from "@/types/content/detail";
import { getGitHubPublishDialogCopy } from "@/utils/github-publish-dialog";
import { getGitHubPublishRecovery } from "@/utils/github-publish-recovery";
import {
  formatGitHubRepositoryLabel,
  getGitHubPublishRepositoryLists,
  isGitHubContentPublishingEnabled,
} from "@/utils/github-publish-repositories";

function GitHubPublishDialogBody({
  contentLabel,
  connectedRepositoryCount,
  integrationsLoadFailed,
  isLoadingIntegrations,
  isPublishing,
  onRepositoryChange,
  onRetryIntegrations,
  organizationSlug,
  publishRecovery,
  pullRequest,
  repositories,
  selectedPublishingEnabled,
  selectedRepository,
  title,
}: GitHubPublishDialogBodyProps) {
  if (pullRequest) {
    return (
      <GitHubPublishResultCard
        pullRequest={pullRequest}
        repositoryLabel={
          selectedRepository
            ? formatGitHubRepositoryLabel(selectedRepository)
            : "Repository"
        }
        title={title}
      />
    );
  }

  return (
    <>
      <GitHubPublishRepositoryField
        connectedRepositoryCount={connectedRepositoryCount}
        contentLabel={contentLabel}
        integrationsLoadFailed={integrationsLoadFailed}
        isLoadingIntegrations={isLoadingIntegrations}
        isPublishing={isPublishing}
        onRepositoryChange={onRepositoryChange}
        onRetryIntegrations={onRetryIntegrations}
        organizationSlug={organizationSlug}
        repositories={repositories}
        selectedPublishingEnabled={selectedPublishingEnabled}
        selectedRepository={selectedRepository}
      />
      {publishRecovery ? (
        <GitHubPublishRecoveryAlert publishRecovery={publishRecovery} />
      ) : null}
    </>
  );
}

export function PublishContentToGitHubDialog({
  contentId,
  contentType,
  onSave,
  organizationId,
  organizationSlug,
  title,
}: PublishContentToGitHubDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [repositoryId, setRepositoryId] = useState("");
  const contentLabel = contentType === "changelog" ? "changelog" : "blog post";

  const integrationsQuery = useQuery(
    dashboardOrpc.integrations.list.queryOptions({
      input: { organizationId },
      enabled: open,
      staleTime: 5 * 60 * 1000,
    })
  );
  const { connected, publishable: repositories } =
    getGitHubPublishRepositoryLists(integrationsQuery.data?.integrations ?? []);
  const integrationsLoadFailed =
    integrationsQuery.isError && !integrationsQuery.data;
  const selectedRepository =
    repositories.find((repository) => repository.id === repositoryId) ??
    repositories[0];
  const selectedPublishingEnabled = selectedRepository
    ? isGitHubContentPublishingEnabled(selectedRepository, contentType)
    : false;

  const invalidateIntegrations = () => {
    queryClient.invalidateQueries({
      queryKey: dashboardOrpc.integrations.list.queryKey({
        input: { organizationId },
      }),
    });
  };

  const publishMutation = useMutation({
    mutationFn: async (targetRepositoryId: string) => {
      const saved = await onSave();
      if (!saved) {
        throw new Error(`Save the ${contentLabel} before publishing it`);
      }

      return dashboardOrpc.content.publishChangelogToGitHub.call({
        organizationId,
        contentId,
        contentType,
        repositoryId: targetRepositoryId,
      });
    },
    onSuccess: (result) => {
      invalidateIntegrations();
      toast.success(
        result.operation === "created"
          ? "Draft pull request created"
          : "Pull request updated"
      );
    },
    onError: (error) => {
      invalidateIntegrations();
      if (getGitHubPublishRecovery(error)) {
        return;
      }
      toast.error(error.message || "Failed to create draft pull request");
    },
  });
  const pullRequest = publishMutation.data;
  const publishRecovery = getGitHubPublishRecovery(publishMutation.error);
  const copy = getGitHubPublishDialogCopy(contentLabel, pullRequest);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!publishMutation.isPending) {
      setOpen(nextOpen);
      if (nextOpen) {
        publishMutation.reset();
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedRepository) {
      publishMutation.mutate(selectedRepository.id);
    }
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger render={<Button size="sm" variant="outline" />}>
        <Github className="size-4" />
        Create GitHub PR
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="min-w-0 sm:max-w-[600px]">
        <form className="min-w-0" onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{copy.title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {copy.description}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <GitHubPublishDialogBody
            contentLabel={contentLabel}
            connectedRepositoryCount={connected.length}
            integrationsLoadFailed={integrationsLoadFailed}
            isLoadingIntegrations={integrationsQuery.isLoading}
            isPublishing={publishMutation.isPending}
            onRepositoryChange={setRepositoryId}
            onRetryIntegrations={() => integrationsQuery.refetch()}
            organizationSlug={organizationSlug}
            publishRecovery={publishRecovery}
            pullRequest={pullRequest}
            repositories={repositories}
            selectedPublishingEnabled={selectedPublishingEnabled}
            selectedRepository={selectedRepository}
            title={title}
          />

          <ResponsiveDialogFooter>
            <GitHubPublishDialogFooter
              hasSelectedRepository={Boolean(selectedRepository)}
              isPublishing={publishMutation.isPending}
              organizationSlug={organizationSlug}
              publishRecovery={publishRecovery}
              pullRequest={pullRequest}
              selectedPublishingEnabled={selectedPublishingEnabled}
            />
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
