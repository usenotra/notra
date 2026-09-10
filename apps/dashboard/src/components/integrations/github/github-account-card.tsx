"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";

import { Button } from "@/components/button";
import type { GitHubAccountCardProps } from "@/types/integrations/github";

export function GitHubAccountCard({
  account,
  repositories,
  selectedRepositoryIds,
  onAddRepositories,
  onDisconnect,
  isDisconnecting,
}: GitHubAccountCardProps) {
  const selectedIds = new Set(selectedRepositoryIds);
  const count = repositories.filter((repository) =>
    selectedIds.has(repository.id)
  ).length;
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar className="size-8">
        <AvatarImage alt="" src={account.avatarUrl} />
        <AvatarFallback>{account.login.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{account.login}</p>
        <p className="text-muted-foreground text-xs">
          {account.type === "Organization"
            ? "Organization"
            : "Personal account"}{" "}
          · {count} {count === 1 ? "repository" : "repositories"}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`Manage ${account.login}`}
              disabled={isDisconnecting}
              size="icon-sm"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onAddRepositories}>
            Manage repositories
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDisconnect} variant="destructive">
            Disconnect account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
