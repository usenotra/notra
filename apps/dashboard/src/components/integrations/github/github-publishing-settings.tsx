"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Switch } from "@notra/ui/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import {
  DEFAULT_GITHUB_CONTENT_DIRECTORIES,
  DEFAULT_GITHUB_CONTENT_OUTPUT_ENABLED,
} from "@/constants/github";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  GitHubContentDirectoryMutationVariables,
  GitHubContentPathMutationVariables,
  GitHubContentPublishingSettingsProps,
  GitHubOutputMutationVariables,
  GitHubPublishingSettingsProps,
} from "@/types/integrations/github";

import { GitHubDirectoryPicker } from "./github-directory-picker";
import { GitHubPublishingPathFields } from "./github-publishing-path-fields";

function GitHubContentPublishingSettings({
  contentLabel,
  contentType,
  organizationId,
  pluralLabel,
  repositories,
}: GitHubContentPublishingSettingsProps) {
  const queryClient = useQueryClient();
  const repositorySelectId = useId();
  const folderTriggerId = useId();
  const [selectedRepositoryId, setSelectedRepositoryId] = useState(
    repositories[0]?.id ?? ""
  );
  const selectedRepository =
    repositories.find((repository) => repository.id === selectedRepositoryId) ??
    repositories[0];
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
  const pathMutation = useMutation({
    mutationFn: ({
      contentPath,
      imagePath,
      targetRepositoryId,
    }: GitHubContentPathMutationVariables) =>
      dashboardOrpc.integrations.repositories.contentDirectory.update.call({
        organizationId,
        repositoryId: targetRepositoryId,
        contentType,
        contentPath,
        imagePath,
      }),
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
      toast.success(`${contentLabel} paths saved`);
    },
    onError: (error) => {
      toast.error(error.message || `Failed to save ${contentLabel} paths`);
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

  if (!selectedRepository) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{contentLabel} publishing</CardTitle>
        <CardDescription>
          Choose where each repository stores generated {pluralLabel}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Field className="max-w-xl">
          <FieldLabel htmlFor={repositorySelectId}>Repository</FieldLabel>
          <Select
            onValueChange={(value) => {
              if (typeof value === "string") {
                setSelectedRepositoryId(value);
              }
            }}
            value={selectedRepository.id}
          >
            <SelectTrigger className="w-full" id={repositorySelectId}>
              <SelectValue placeholder="Select a repository">
                {(value) => {
                  const repository = repositories.find(
                    (candidate) => candidate.id === value
                  );
                  return repository ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <Github className="size-3.5" />
                      <span className="truncate">
                        {repository.owner}/{repository.repo}
                      </span>
                    </span>
                  ) : (
                    "Select a repository"
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {repositories.map((repository) => (
                <SelectItem key={repository.id} value={repository.id}>
                  <Github className="size-3.5" />
                  {repository.owner}/{repository.repo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex max-w-xl items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Publish {pluralLabel}</p>
            <p className="text-muted-foreground text-xs">
              {publishingEnabled
                ? `Create draft pull requests from ${pluralLabel}.`
                : "Publishing is off. Turn it on to resume."}
            </p>
          </div>
          <Switch
            aria-label={`Publish ${pluralLabel}`}
            checked={publishingEnabled}
            disabled={outputMutation.isPending}
            onCheckedChange={(enabled) => {
              outputMutation.mutate({
                enabled,
                outputId: contentOutput?.id,
              });
            }}
          />
        </div>

        <Field className="max-w-xl">
          <FieldLabel htmlFor={folderTriggerId}>
            {contentLabel} folder
          </FieldLabel>
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
              disabled={directoryQuery.isLoading}
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
        </Field>

        <GitHubPublishingPathFields
          contentLabel={contentLabel}
          contentPath={directoryQuery.data?.contentPath ?? null}
          directory={directory}
          disabled={
            directoryQuery.isLoading ||
            (directoryQuery.isError && !directoryQuery.data)
          }
          imagePath={directoryQuery.data?.imagePath ?? null}
          isSaving={pathMutation.isPending}
          key={`${selectedRepository.id}:${directoryQuery.data?.contentPath ?? ""}:${directoryQuery.data?.imagePath ?? ""}`}
          onSave={({ contentPath, imagePath }) => {
            pathMutation.mutate({
              contentPath,
              imagePath,
              targetRepositoryId: selectedRepository.id,
            });
          }}
        />
      </CardContent>
    </Card>
  );
}

export function GitHubPublishingSettings(props: GitHubPublishingSettingsProps) {
  return (
    <>
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
    </>
  );
}
