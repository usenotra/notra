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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { GitHubPublishDialogFooter } from "@/components/content/github-publish-dialog-footer";
import { GitHubPublishRecoveryAlert } from "@/components/content/github-publish-recovery-alert";
import { GitHubPublishRepositoryField } from "@/components/content/github-publish-repository-field";
import { GitHubPublishResultCard } from "@/components/content/github-publish-result-card";
import { useGitHubPublishRepositorySelection } from "@/lib/hooks/use-github-publish-repository-selection";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  GitHubPublishDialogBodyProps,
  PublishContentToGitHubDialogProps,
} from "@/types/content/detail";
import type { ContentApiResponse } from "@/types/hooks/content";
import { getGitHubPublishRecovery } from "@/utils/github-publish-recovery";
import { formatGitHubRepositoryLabel } from "@/utils/github-publish-repositories";
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
  onRetryIntegrations,
  organizationSlug,
  publishRecovery,
  pullRequest,
  repositories,
  selectedPublishingEnabled,
  selectedRepository,
  title,
}: GitHubPublishDialogBodyProps) {
  const tCommon = useTranslations("common");
  if (pullRequest) {
    const repositoryLabel = selectedRepository
      ? formatGitHubRepositoryLabel(selectedRepository)
      : tCommon("labels.repository");

    return (
      <GitHubPublishResultCard
        pullRequest={pullRequest}
        repositoryLabel={repositoryLabel}
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
  githubPublish,
  onSave,
  organizationId,
  organizationSlug,
  title,
}: PublishContentToGitHubDialogProps) {
  const t = useTranslations("content.githubPublish");
  const tContentShared = useTranslations("content.shared");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [repositoryId, setRepositoryId] = useState(
    () =>
      githubPublish?.repositoryId ??
      readStoredGitHubPublishRepositoryId(organizationId) ??
      ""
  );
  const {
    repositories,
    selectedRepositoryId,
    selectedRepository,
    selectedPublishingEnabled,
    fieldProps,
  } = useGitHubPublishRepositorySelection({
    organizationId,
    contentType,
    repositoryId,
    enabled: open,
  });
  const { contentLabel } = fieldProps;

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
        throw new Error(t("saveBeforePublishing", { kind: contentLabel }));
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
      const linkedRepository = repository;
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
          ? t("prCreated")
          : tContentShared("pullRequestUpdated")
      );
    },
    onError: (error) => {
      invalidateIntegrations();
      if (getGitHubPublishRecovery(error)) {
        return;
      }
      toast.error(error.message || t("createFailed"));
    },
  });
  const pullRequest = publishMutation.data;
  const publishRecovery = getGitHubPublishRecovery(publishMutation.error);
  let copy = {
    description: t("createDescription", { kind: contentLabel }),
    title: t("createTitle"),
  };
  if (pullRequest?.operation === "created") {
    copy = {
      description: t("createdDescription", { kind: contentLabel }),
      title: t("prCreated"),
    };
  } else if (pullRequest) {
    copy = {
      description: t("updatedDescription", { kind: contentLabel }),
      title: tContentShared("pullRequestUpdated"),
    };
  }

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
    if (selectedRepository) {
      rememberRepository(selectedRepository.id);
      publishMutation.mutate(selectedRepository.id);
    }
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger render={<Button size="sm" variant="outline" />}>
        <Github className="size-4" />
        {t("trigger")}
      </ResponsiveDialogTrigger>
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
              {...fieldProps}
              isPublishing={publishMutation.isPending}
              onRepositoryChange={handleRepositoryChange}
              organizationSlug={organizationSlug}
              publishRecovery={publishRecovery}
              pullRequest={pullRequest}
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
            />
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
