"use client";

import { Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DropdownMenuItem } from "@notra/ui/components/ui/dropdown-menu";
import { cn } from "@notra/ui/lib/utils";
import { useLocale, useTranslations } from "use-intl";

import { useCreditBalance } from "@/lib/hooks/use-credit-balance";
import type { CreditBalanceMenuItemProps } from "@/types/billing/credits";
import { formatDollars } from "@/utils/format";

export function CreditBalanceMenuItem({
  className,
  onOpenTopup,
}: CreditBalanceMenuItemProps) {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { isLoading, hasActiveSubscription, balance } = useCreditBalance();

  if (isLoading || !hasActiveSubscription) {
    return null;
  }

  return (
    <DropdownMenuItem
      className={cn("cursor-pointer", className)}
      onClick={onOpenTopup}
    >
      <HugeiconsIcon icon={Wallet01Icon} />
      {tCommon("labels.credits")}
      {balance !== null ? (
        <span className="text-muted-foreground ml-auto tabular-nums">
          {formatDollars(balance, locale)}
        </span>
      ) : null}
    </DropdownMenuItem>
  );
}
