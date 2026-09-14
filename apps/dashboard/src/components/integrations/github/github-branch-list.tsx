"use client";

import {
  GitBranchIcon,
  GitBranchPlusIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@notra/ui/components/ui/command";

import { Button } from "@/components/button";
import type { GitHubBranchListProps } from "@/types/integrations/github";

export function GitHubBranchList({
  branches,
  canCreate,
  currentBranch,
  isError,
  isLoading,
  isUpdating,
  onCreate,
  onRetry,
  onSelect,
}: GitHubBranchListProps) {
  return (
    <Command className="h-full">
      <CommandInput autoFocus placeholder="Search branches" />
      <CommandList className="max-h-none min-h-0 flex-1">
        <div className="bg-popover sticky top-0 z-10 border-b p-1">
          <Button
            className="w-full justify-start"
            disabled={!canCreate}
            onClick={onCreate}
            size="sm"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon className="size-4" icon={GitBranchPlusIcon} />
            Create branch
          </Button>
        </div>
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
            <HugeiconsIcon
              className="size-4 animate-spin"
              icon={Loading03Icon}
            />
            Loading branches…
          </div>
        ) : null}
        {isError ? (
          <div className="space-y-2 px-3 py-4 text-center">
            <p className="text-destructive text-sm" role="alert">
              Unable to load branches.
            </p>
            <Button onClick={onRetry} size="sm" type="button" variant="outline">
              Retry
            </Button>
          </div>
        ) : null}
        {!isLoading && !isError ? (
          <>
            <CommandEmpty>No branches found.</CommandEmpty>
            {branches.map((branch) => (
              <CommandItem
                data-checked={branch === currentBranch}
                disabled={isUpdating}
                key={branch}
                onSelect={() => onSelect(branch)}
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
  );
}
