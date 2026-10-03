"use client";

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

import { XVerificationBadge } from "@/components/icons/x-verification-badge";
import { cn } from "@/lib/utils";
import type { SocialAccountSelectorProps } from "@/types/content/social-account-selector";
import { isSquareTwitterAvatar } from "@/utils/twitter";

export function SocialAccountSelector({
  accounts,
  onSelect,
  trigger,
  className,
  style,
}: SocialAccountSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hover:bg-accent flex min-w-0 cursor-pointer items-center gap-1 rounded-md",
          className
        )}
        style={style}
      >
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => onSelect(account.id)}
          >
            <Avatar
              className={cn(
                "size-6",
                isSquareTwitterAvatar(account.verifiedType)
                  ? "rounded-sm"
                  : "rounded-full"
              )}
              size="sm"
            >
              {account.profileImageUrl && (
                <AvatarImage
                  alt={account.displayName}
                  src={account.profileImageUrl}
                />
              )}
              <AvatarFallback className="text-[0.5rem]">
                {account.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="flex min-w-0 items-center gap-1 text-xs font-medium">
                <span className="truncate">{account.displayName}</span>
                <XVerificationBadge
                  className="size-3.5 shrink-0"
                  verified={account.verified}
                  verifiedType={account.verifiedType}
                />
              </span>
              <span className="text-muted-foreground truncate text-xs">
                @{account.username}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
