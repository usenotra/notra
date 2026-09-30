"use client";

import {
  Add01Icon,
  ArrowDown01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import type { GitHubAccountSelectProps } from "@/types/integrations/github";

export function GitHubAccountSelect({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  disabled = false,
}: GitHubAccountSelectProps) {
  const t = useTranslations("integrations.github.accountSelect");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="h-9 w-full justify-between gap-2"
            disabled={disabled}
            variant="outline"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <Github className="size-4 shrink-0" />
          <span className="min-w-0 truncate">
            {selectedAccount?.login ?? t("placeholder")}
          </span>
        </span>
        <HugeiconsIcon
          className="text-muted-foreground size-4 shrink-0"
          icon={ArrowDown01Icon}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {accounts.map((account) => (
          <DropdownMenuItem
            className="gap-2"
            key={account.id}
            onClick={() => onSelectAccount?.(account.id)}
          >
            <Github className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{account.login}</span>
            {account.id === selectedAccount?.id ? (
              <HugeiconsIcon className="size-4 shrink-0" icon={Tick02Icon} />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          disabled={!onAddAccount}
          onClick={onAddAccount}
        >
          <HugeiconsIcon className="size-4 shrink-0" icon={Add01Icon} />
          {tIntegrationsShared("addGithubAccount")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
