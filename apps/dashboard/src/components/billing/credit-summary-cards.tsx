"use client";

import { FEATURES } from "@notra/ai/billing/features";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { cn } from "@notra/ui/lib/utils";
import { useLocale, useTranslations } from "use-intl";

import type { CreditSummaryCardsProps } from "@/types/billing/credits";
import { formatDollars, usageBarColor } from "@/utils/format";

export function CreditSummaryCards({
  customer,
  isLoading,
  totalUsage,
  range,
  balanceAction,
}: CreditSummaryCardsProps) {
  const t = useTranslations("billing.creditSummary");
  const tCommon = useTranslations("common");
  const tBillingShared = useTranslations("billing.shared");
  const locale = useLocale();
  const aiCredits = customer?.balances?.[FEATURES.AI_CREDITS];
  const balance =
    typeof aiCredits?.remaining === "number" ? aiCredits.remaining : null;
  const included =
    typeof aiCredits?.granted === "number" ? aiCredits.granted : null;
  const usagePercent =
    included && included > 0
      ? Math.min(
          Math.max(((included - (balance ?? 0)) / included) * 100, 0),
          100
        )
      : 0;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <TitleCard
        accentColor="#10b981"
        action={balanceAction}
        className="min-w-0"
        heading={tBillingShared("currentBalance")}
      >
        <div>
          <p className="text-3xl font-bold tracking-tight wrap-anywhere tabular-nums">
            {balance !== null ? formatDollars(balance, locale) : "-"}
          </p>
          {included !== null && (
            <p className="text-muted-foreground mt-1 text-sm wrap-anywhere">
              {t("included", { amount: formatDollars(included, locale) })}
            </p>
          )}
        </div>
      </TitleCard>
      <TitleCard
        accentColor="#8b5cf6"
        className="min-w-0"
        heading={t("usedThisPeriod")}
      >
        <div>
          <p className="text-3xl font-bold tracking-tight wrap-anywhere tabular-nums">
            {formatDollars(totalUsage, locale)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("inTheLast", { range })}
          </p>
        </div>
      </TitleCard>
      <TitleCard className="min-w-0" heading={tCommon("labels.usage")}>
        <div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {Math.round(usagePercent)}%
            </p>
            <p className="text-muted-foreground text-sm">{t("ofPlan")}</p>
          </div>
          <div className="bg-muted mt-3 h-2 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                "duration-slower h-full rounded-full transition-all",
                usagePercent > 90
                  ? "bg-destructive"
                  : usageBarColor(usagePercent)
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </TitleCard>
    </div>
  );
}
