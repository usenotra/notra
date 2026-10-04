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
import { useTranslations } from "use-intl";

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
  const t = useTranslations("integrations.github.repositoryMenu");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t("ariaLabel", { name: integration.displayName })}
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
            {t("manageSelection")}
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => onDialog("edit")}>
              <HugeiconsIcon className="size-4" icon={Edit02Icon} />
              {t("editRepository")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDialog("token")}>
              <HugeiconsIcon className="size-4" icon={Key01Icon} />
              {t("updateToken")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isMigrating} onClick={onMigrate}>
              <HugeiconsIcon className="size-4" icon={Github01Icon} />
              {isMigrating ? t("switching") : t("switchToApp")}
            </DropdownMenuItem>
            {integration.repositories.length > 0 ? (
              <DropdownMenuItem onClick={onToggleWebhooks}>
                <HugeiconsIcon
                  className="size-4"
                  icon={webhooksOpen ? ViewOffSlashIcon : WebhookIcon}
                />
                {webhooksOpen ? t("hideWebhooks") : t("webhookSettings")}
              </DropdownMenuItem>
            ) : null}
          </>
        )}
        <DropdownMenuItem onClick={onToggle}>
          <HugeiconsIcon
            className="size-4"
            icon={isEnabled ? PauseIcon : PlayIcon}
          />
          {isEnabled ? t("pause") : t("enable")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDialog("delete")}
          variant="destructive"
        >
          <HugeiconsIcon className="size-4" icon={Delete02Icon} />
          {t("remove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
