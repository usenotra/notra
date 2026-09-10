"use client";

import { Switch } from "@notra/ui/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import {
  DEFAULT_GITHUB_CONTENT_DIRECTORIES,
  DEFAULT_GITHUB_CONTENT_OUTPUT_ENABLED,
} from "@/constants/github";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  GitHubContentDirectoryMutationVariables,
  GitHubContentPublishingSettingsProps,
  GitHubOutputMutationVariables,
  GitHubPublishingSettingsProps,
} from "@/types/integrations/github";

import { GitHubDirectoryPicker } from "./github-directory-picker";

function GitHubContentPublishingSettings({
  contentLabel,
  contentType,
  organizationId,
  pluralLabel,
  repository: selectedRepository,
  disabled = false,
}: GitHubContentPublishingSettingsProps) {
  const queryClient = useQueryClient();
  const folderTriggerId = useId();
  const publishingSwitchId = useId();
  const repositoryId = selectedRepository?.id ?? "";
  const contentOutput = selectedRepository?.outputs?.find(
    (output) => output.outputType === contentType
  );
  const publishingEnabled =
    contentOutput?.enabled ??
    DEFAULT_GITHUB_CONTENT_OUTPUT_ENABLED[contentType];
  const directoryQuery = useQuery(
    dashboardOrpc.integrations.repositories.contentDirectory.get.queryOptions({
      input: {
        organizationId,
        repositoryId,
        contentType,
      },
      enabled: Boolean(organizationId && repositoryId),
      staleTime: 5 * 60 * 1000,
    })
  );
  const directory =
    directoryQuery.data?.directory ??
    DEFAULT_GITHUB_CONTENT_DIRECTORIES[contentType];
  const directoryMutation = useMutation({
    mutationFn: ({
      nextDirectory,
      targetRepositoryId,
    }: GitHubContentDirectoryMutationVariables) =>
      dashboardOrpc.integrations.repositories.contentDirectory.update.call({
        organizationId,
        repositoryId: targetRepositoryId,
        contentType,
        directory: nextDirectory,
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey:
          dashboardOrpc.integrations.repositories.contentDirectory.get.queryKey(
            {
              input: {
                organizationId,
                repositoryId: variables.targetRepositoryId,
                contentType,
              },
            }
          ),
      });
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData(
        dashboardOrpc.integrations.repositories.contentDirectory.get.queryKey({
          input: {
            organizationId,
            repositoryId: variables.targetRepositoryId,
            contentType,
          },
        }),
        result
      );
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.list.queryKey({
          input: { organizationId },
        }),
      });
      toast.success(`${contentLabel} folder saved`);
    },
    onError: (error) => {
      toast.error(error.message || `Failed to save ${contentLabel} folder`);
    },
  });
  const outputMutation = useMutation({
    mutationFn: ({ enabled, outputId }: GitHubOutputMutationVariables) =>
      outputId
        ? dashboardOrpc.integrations.outputs.update.call({
            organizationId,
            outputId,
            enabled,
          })
        : dashboardOrpc.integrations.repositories.configureOutput.call({
            organizationId,
            repositoryId,
            outputType: contentType,
            enabled,
          }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.list.queryKey({
          input: { organizationId },
        }),
      });
      toast.success(
        variables.enabled
          ? `${contentLabel} publishing resumed`
          : `${contentLabel} publishing paused`
      );
    },
    onError: (error) => {
      toast.error(
        error.message || `Failed to update ${contentLabel} publishing`
      );
    },
  });

  return (
    <div className="min-w-0 space-y-2.5">
      <div className="flex items-center gap-2">
        <Switch
          id={publishingSwitchId}
          aria-label={`Publish ${pluralLabel} to ${selectedRepository.owner}/${selectedRepository.repo}`}
          checked={publishingEnabled}
          disabled={disabled || outputMutation.isPending}
          onCheckedChange={(enabled) => {
            outputMutation.mutate({
              enabled,
              outputId: contentOutput?.id,
            });
          }}
        />
        <label
          className="cursor-pointer text-xs font-medium"
          htmlFor={publishingSwitchId}
        >
          {contentLabel}
        </label>
      </div>

      <div className="min-w-0">
        {directoryQuery.isError && !directoryQuery.data ? (
          <div
            className="border-destructive/30 flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3"
            role="alert"
          >
            <p className="text-destructive text-sm">
              Unable to load the {contentLabel} folder.
            </p>
            <Button
              onClick={() => directoryQuery.refetch()}
              size="sm"
              type="button"
              variant="ghost"
            >
              Retry
            </Button>
          </div>
        ) : (
          <GitHubDirectoryPicker
            contentLabel={contentLabel}
            directory={directory}
            disabled={disabled || directoryQuery.isLoading}
            isSaving={directoryMutation.isPending}
            key={selectedRepository.id}
            onSave={async (nextDirectory) => {
              await directoryMutation.mutateAsync({
                nextDirectory,
                targetRepositoryId: selectedRepository.id,
              });
            }}
            organizationId={organizationId}
            repositoryId={selectedRepository.id}
            repositoryName={`${selectedRepository.owner}/${selectedRepository.repo}`}
            triggerId={folderTriggerId}
          />
        )}
      </div>
    </div>
  );
}

export function GitHubPublishingSettings(props: GitHubPublishingSettingsProps) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <GitHubContentPublishingSettings
        {...props}
        contentLabel="Changelog"
        contentType="changelog"
        pluralLabel="changelogs"
      />
      <GitHubContentPublishingSettings
        {...props}
        contentLabel="Blog post"
        contentType="blog_post"
        pluralLabel="blog posts"
      />
    </div>
  );
}
