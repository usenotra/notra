import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";

import { Button } from "@/components/button";
import type { GitHubRepositoryMenuProps } from "@/types/integrations/github";

export function GitHubRepositoryMenu({
  integration,
  isPending,
  isEnabled,
  onToggle,
  onDialog,
  onManageRepositories,
  isMigrating,
  onMigrate,
  onToggleWebhooks,
  webhooksOpen,
}: GitHubRepositoryMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Manage ${integration.displayName}`}
            disabled={isPending}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {integration.managedByGitHubApp ? (
          <DropdownMenuItem onClick={onManageRepositories}>
            Manage selection
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => onDialog("edit")}>
              Edit repository
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDialog("token")}>
              Update access token
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isMigrating} onClick={onMigrate}>
              {isMigrating ? "Switching…" : "Switch to GitHub App"}
            </DropdownMenuItem>
            {integration.repositories.length > 0 ? (
              <DropdownMenuItem onClick={onToggleWebhooks}>
                {webhooksOpen ? "Hide webhooks" : "Webhook settings"}
              </DropdownMenuItem>
            ) : null}
          </>
        )}
        <DropdownMenuItem onClick={onToggle}>
          {isEnabled ? "Pause repository" : "Enable repository"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDialog("delete")}
          variant="destructive"
        >
          Remove repository
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
