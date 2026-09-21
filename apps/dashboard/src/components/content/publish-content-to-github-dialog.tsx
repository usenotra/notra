"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { type FormEvent, useEffect, useState } from "react";
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
import type { ContentApiResponse } from "@/types/hooks/content";
import { getGitHubPublishDialogCopy } from "@/utils/github-publish-dialog";
import { getGitHubPublishRecovery } from "@/utils/github-publish-recovery";
import {
  formatGitHubRepositoryLabel,
  getGitHubPublishRepositoryLists,
  isGitHubContentPublishingEnabled,
  resolveGitHubPublishRepositoryId,
} from "@/utils/github-publish-repositories";
import {
  readStoredGitHubPublishRepositoryId,
  writeStoredGitHubPublishRepositoryId,
} from "@/utils/github-publish-repository-preference";

function GitHubPublishDialogBody({
  contentLabel,
  connectedRepositoryCount,
  integrationsLoadFailed,
  isLoadingIntegrations,
  isPublishing,
  onRepositoryChange,
  linkedPublish,
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
    let repositoryLabel = "Repository";
    if (selectedRepository) {
      repositoryLabel = formatGitHubRepositoryLabel(selectedRepository);
    } else if (linkedPublish) {
      repositoryLabel = `${linkedPublish.owner}/${linkedPublish.repo}`;
    }

    return (
      <GitHubPublishResultCard
        pullRequest={pullRequest}
        repositoryLabel={repositoryLabel}
        title={title}
      />
    );
  }

  if (linkedPublish) {
    const linkedLabel = `${linkedPublish.owner}/${linkedPublish.repo} #${linkedPublish.pullRequestNumber}`;

    return (
      <>
        <a
          className="hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
          href={linkedPublish.pullRequestUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Github className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{linkedLabel}</span>
          <HugeiconsIcon
            className="size-4 shrink-0"
            icon={ArrowUpRight01Icon}
          />
        </a>
        {isPublishing ? (
          <p className="text-sm">Publishing the latest Markdown…</p>
        ) : null}
        {publishRecovery ? (
          <GitHubPublishRecoveryAlert publishRecovery={publishRecovery} />
        ) : null}
      </>
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
  githubPublish,
  onSave,
  organizationId,
  organizationSlug,
  title,
}: PublishContentToGitHubDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [repositoryId, setRepositoryId] = useState(
    () =>
      githubPublish?.repositoryId ??
      readStoredGitHubPublishRepositoryId(organizationId) ??
      ""
  );
  const contentLabel = contentType === "changelog" ? "changelog" : "blog post";

  useEffect(() => {
    setRepositoryId(
      githubPublish?.repositoryId ??
        readStoredGitHubPublishRepositoryId(organizationId) ??
        ""
    );
  }, [githubPublish?.repositoryId, organizationId]);

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
  const selectedRepositoryId = resolveGitHubPublishRepositoryId(
    repositoryId,
    repositories
  );
  const selectedRepository = repositories.find(
    (repository) => repository.id === selectedRepositoryId
  );
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
    onSuccess: (result, targetRepositoryId) => {
      const repository = repositories.find(
        (item) => item.id === targetRepositoryId
      );
      const linkedRepository =
        repository ??
        (githubPublish?.repositoryId === targetRepositoryId
          ? {
              id: githubPublish.repositoryId,
              owner: githubPublish.owner,
              repo: githubPublish.repo,
            }
          : undefined);
      invalidateIntegrations();
      if (linkedRepository) {
        queryClient.setQueryData<ContentApiResponse>(
          dashboardOrpc.content.get.queryKey({
            input: { organizationId, contentId },
          }),
          (current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              content: {
                ...current.content,
                githubPublish: {
                  branchName: result.branchName,
                  owner: linkedRepository.owner,
                  path: result.path,
                  pullRequestNumber: result.pullRequestNumber,
                  pullRequestUrl: result.pullRequestUrl,
                  repo: linkedRepository.repo,
                  repositoryId: linkedRepository.id,
                },
              },
            };
          }
        );
      }
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.content.get.queryKey({
          input: { organizationId, contentId },
        }),
      });
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
  const linkedLabel = githubPublish
    ? `${githubPublish.owner}/${githubPublish.repo}#${githubPublish.pullRequestNumber}`
    : undefined;
  const updatingLinkedPullRequest = Boolean(linkedLabel) && !pullRequest;
  const copy = getGitHubPublishDialogCopy(
    contentLabel,
    pullRequest,
    updatingLinkedPullRequest ? linkedLabel : undefined
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (publishMutation.isPending) {
        return;
      }
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!publishMutation.isPending) {
      publishMutation.reset();
    }
  };

  const rememberRepository = (nextRepositoryId: string) => {
    setRepositoryId(nextRepositoryId);
    writeStoredGitHubPublishRepositoryId(organizationId, nextRepositoryId);
  };

  const handleRepositoryChange = (nextRepositoryId: string) => {
    if (nextRepositoryId === selectedRepositoryId) {
      return;
    }
    rememberRepository(nextRepositoryId);
    publishMutation.reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (publishMutation.isPending) {
      return;
    }
    if (githubPublish) {
      publishMutation.mutate(githubPublish.repositoryId);
      return;
    }
    if (selectedRepository) {
      rememberRepository(selectedRepository.id);
      publishMutation.mutate(selectedRepository.id);
    }
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      {githubPublish ? (
        <ResponsiveDialogTrigger
          render={<Button size="sm" variant="outline" />}
        >
          <Github className="size-4" />
          <span className="max-w-52 truncate">
            {githubPublish.owner}/{githubPublish.repo} #
            {githubPublish.pullRequestNumber}
          </span>
        </ResponsiveDialogTrigger>
      ) : (
        <ResponsiveDialogTrigger
          render={<Button size="sm" variant="outline" />}
        >
          <Github className="size-4" />
          Create GitHub PR
        </ResponsiveDialogTrigger>
      )}
      <ResponsiveDialogContent className="min-w-0 sm:max-w-[600px]">
        <form className="contents" onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{copy.title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {copy.description}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="min-w-0 space-y-4">
            <GitHubPublishDialogBody
              contentLabel={contentLabel}
              connectedRepositoryCount={connected.length}
              integrationsLoadFailed={integrationsLoadFailed}
              isLoadingIntegrations={integrationsQuery.isLoading}
              isPublishing={publishMutation.isPending}
              onRepositoryChange={handleRepositoryChange}
              linkedPublish={githubPublish}
              onRetryIntegrations={() => integrationsQuery.refetch()}
              organizationSlug={organizationSlug}
              publishRecovery={publishRecovery}
              pullRequest={pullRequest}
              repositories={repositories}
              selectedPublishingEnabled={selectedPublishingEnabled}
              selectedRepository={selectedRepository}
              title={title}
            />
          </div>

          <ResponsiveDialogFooter>
            <GitHubPublishDialogFooter
              hasSelectedRepository={Boolean(selectedRepository)}
              isPublishing={publishMutation.isPending}
              organizationSlug={organizationSlug}
              publishRecovery={publishRecovery}
              pullRequest={pullRequest}
              selectedPublishingEnabled={selectedPublishingEnabled}
              updatingLinkedPullRequest={updatingLinkedPullRequest}
            />
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
