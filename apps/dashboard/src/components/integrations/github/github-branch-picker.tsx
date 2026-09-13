"use client";

import { GitBranchIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@notra/ui/components/ui/command";
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

export function GitHubBranchPicker({
  organizationId,
  repository,
}: GitHubBranchPickerProps) {
  const [open, setOpen] = useState(false);
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
  const branches = Array.from(
    new Set([
      ...(repository.defaultBranch ? [repository.defaultBranch] : []),
      ...(branchesQuery.data?.branches ?? []),
    ])
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Change publishing branch ${repository.defaultBranch ?? "not selected"} for ${repository.owner}/${repository.repo}`}
            className="text-muted-foreground h-7 max-w-52 min-w-0 gap-1.5 px-2 font-normal"
            disabled={branchMutation.isPending}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            size="sm"
            variant="ghost"
          />
        }
      >
        {branchMutation.isPending ? (
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
      <PopoverContent align="start" className="w-72 gap-0 p-0">
        <Command>
          <CommandInput autoFocus placeholder="Search branches" />
          <CommandList>
            {branchesQuery.isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                <HugeiconsIcon
                  className="size-4 animate-spin"
                  icon={Loading03Icon}
                />
                Loading branches…
              </div>
            ) : null}
            {branchesQuery.isError ? (
              <div className="space-y-2 px-3 py-4 text-center">
                <p className="text-destructive text-sm" role="alert">
                  Unable to load branches.
                </p>
                <Button
                  onClick={() => branchesQuery.refetch()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {!branchesQuery.isLoading && !branchesQuery.isError ? (
              <>
                <CommandEmpty>No branches found.</CommandEmpty>
                {branches.map((branch) => (
                  <CommandItem
                    data-checked={branch === repository.defaultBranch}
                    disabled={branchMutation.isPending}
                    key={branch}
                    onSelect={() => {
                      if (branch === repository.defaultBranch) {
                        setOpen(false);
                        return;
                      }
                      branchMutation.mutate(branch);
                    }}
                    value={branch}
                  >
                    <HugeiconsIcon
                      className="text-muted-foreground size-4"
                      icon={GitBranchIcon}
                    />
                    <span className="truncate">{branch}</span>
                  </CommandItem>
                ))}
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
