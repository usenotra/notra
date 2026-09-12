import {
  CheckListIcon,
  Delete02Icon,
  Edit02Icon,
  Github01Icon,
  Key01Icon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  ViewOffSlashIcon,
  WebhookIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
      <DropdownMenuContent align="end" className="min-w-56">
        {integration.managedByGitHubApp ? (
          <DropdownMenuItem onClick={onManageRepositories}>
            <HugeiconsIcon className="size-4" icon={CheckListIcon} />
            Manage selection
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => onDialog("edit")}>
              <HugeiconsIcon className="size-4" icon={Edit02Icon} />
              Edit repository
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDialog("token")}>
              <HugeiconsIcon className="size-4" icon={Key01Icon} />
              Update access token
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isMigrating} onClick={onMigrate}>
              <HugeiconsIcon className="size-4" icon={Github01Icon} />
              {isMigrating ? "Switching…" : "Switch to GitHub App"}
            </DropdownMenuItem>
            {integration.repositories.length > 0 ? (
              <DropdownMenuItem onClick={onToggleWebhooks}>
                <HugeiconsIcon
                  className="size-4"
                  icon={webhooksOpen ? ViewOffSlashIcon : WebhookIcon}
                />
                {webhooksOpen ? "Hide webhooks" : "Webhook settings"}
              </DropdownMenuItem>
            ) : null}
          </>
        )}
        <DropdownMenuItem onClick={onToggle}>
          <HugeiconsIcon
            className="size-4"
            icon={isEnabled ? PauseIcon : PlayIcon}
          />
          {isEnabled ? "Pause repository" : "Enable repository"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDialog("delete")}
          variant="destructive"
        >
          <HugeiconsIcon className="size-4" icon={Delete02Icon} />
          Remove repository
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
