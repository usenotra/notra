"use client";

import { GitBranchIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { GitHubBranchPickerProps } from "@/types/integrations/github";

import { GitHubBranchList } from "./github-branch-list";
import { GitHubBranchPanelTransition } from "./github-branch-panel-transition";
import { GitHubCreateBranchForm } from "./github-create-branch-form";

export function GitHubBranchPicker({
  organizationId,
  repository,
}: GitHubBranchPickerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();
  const branchesQuery = useQuery({
    ...dashboardOrpc.integrations.repositories.branches.list.queryOptions({
      input: { organizationId, repositoryId: repository.id },
    }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const branchMutation = useMutation({
    mutationFn: (defaultBranch: string) =>
      dashboardOrpc.integrations.repositories.update.call({
        organizationId,
        repositoryId: repository.id,
        defaultBranch,
      }),
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.key(),
      });
      toast.success("Publishing branch updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update publishing branch");
    },
  });
  const createBranchMutation = useMutation({
    mutationFn: (branchName: string) =>
      dashboardOrpc.integrations.repositories.branches.create.call({
        organizationId,
        repositoryId: repository.id,
        branchName,
      }),
    onSuccess: async (_, branchName) => {
      setCreating(false);
      setOpen(false);
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.integrations.key(),
      });
      toast.success(`Branch ${branchName} created`);
    },
  });
  const isPending = branchMutation.isPending || createBranchMutation.isPending;
  const closeCreateBranchForm = () => {
    setCreating(false);
    createBranchMutation.reset();
  };
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      closeCreateBranchForm();
    }
  };
  const branches = Array.from(
    new Set([
      ...(repository.defaultBranch ? [repository.defaultBranch] : []),
      ...(branchesQuery.data?.branches ?? []),
    ])
  );

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Change publishing branch ${repository.defaultBranch ?? "not selected"} for ${repository.owner}/${repository.repo}`}
            className="text-muted-foreground h-7 max-w-52 min-w-0 gap-1.5 px-2 font-normal"
            disabled={isPending}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            size="sm"
            variant="ghost"
          />
        }
      >
        {isPending ? (
          <HugeiconsIcon
            className="size-3.5 animate-spin"
            icon={Loading03Icon}
          />
        ) : (
          <HugeiconsIcon className="size-3.5" icon={GitBranchIcon} />
        )}
        <span className="truncate">
          {repository.defaultBranch ?? "Choose branch"}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="h-68 w-72 gap-0 overflow-hidden p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <GitHubBranchPanelTransition
          creating={creating}
          createForm={
            <GitHubCreateBranchForm
              baseBranch={repository.defaultBranch ?? "the publishing branch"}
              errorMessage={
                createBranchMutation.isError
                  ? createBranchMutation.error.message ||
                    "Unable to create branch. Check the name and try again."
                  : undefined
              }
              isPending={createBranchMutation.isPending}
              onCancel={closeCreateBranchForm}
              onChange={createBranchMutation.reset}
              onSubmit={(branchName) => createBranchMutation.mutate(branchName)}
            />
          }
          branchList={
            <GitHubBranchList
              branches={branches}
              canCreate={
                Boolean(repository.defaultBranch) && !branchMutation.isPending
              }
              currentBranch={repository.defaultBranch}
              isError={branchesQuery.isError}
              isLoading={branchesQuery.isLoading}
              isUpdating={branchMutation.isPending}
              onCreate={() => {
                setCreating(true);
                createBranchMutation.reset();
              }}
              onRetry={() => branchesQuery.refetch()}
              onSelect={(branch) => {
                if (branch === repository.defaultBranch) {
                  setOpen(false);
                  return;
                }
                branchMutation.mutate(branch);
              }}
            />
          }
        />
      </PopoverContent>
    </Popover>
  );
}
