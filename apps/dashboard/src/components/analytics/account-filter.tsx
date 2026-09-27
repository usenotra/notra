"use client";

import { Linkedin02Icon, NewTwitterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";

import { cn } from "@/lib/utils";
import type { SocialOverviewAccount } from "@/types/analytics";
import { accountSeriesKey } from "@/utils/analytics-charts";

interface AccountFilterProps {
  accounts: SocialOverviewAccount[];
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
}

export function AccountFilter({
  accounts,
  selectedKeys,
  onToggle,
}: AccountFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {accounts.map((account) => {
        const key = accountSeriesKey(
          account.provider,
          account.providerAccountId
        );
        const selected = selectedKeys.has(key);
        return (
          <button
            aria-pressed={selected}
            className={cn(
              "flex max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm border py-1 pr-2.5 pl-1 font-mono text-xs transition-colors",
              selected
                ? "border-border bg-muted/60"
                : "bg-muted/20 border-transparent opacity-50 hover:opacity-80"
            )}
            key={key}
            onClick={() => onToggle(key)}
            type="button"
          >
            <Avatar className="size-6 shrink-0">
              {account.profileImageUrl && (
                <AvatarImage
                  alt={account.username}
                  src={account.profileImageUrl}
                />
              )}
              <AvatarFallback className="text-[0.5rem]">
                {account.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate" title={`@${account.username}`}>
              @{account.username}
            </span>
            <HugeiconsIcon
              className="text-muted-foreground shrink-0"
              icon={
                account.provider === "linkedin"
                  ? Linkedin02Icon
                  : NewTwitterIcon
              }
              size={12}
            />
          </button>
        );
      })}
    </div>
  );
}
