"use client";

import {
  InstrumentEmpty,
  InstrumentModule,
} from "@notra/ui/components/instrument/instrument-module";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { useFormatter, useTranslations } from "use-intl";

import { ChartSparkline } from "@/components/charts/chart-sparkline";
import { useFormatMetric } from "@/lib/hooks/use-format-metric";
import { cn } from "@/lib/utils";
import type {
  FollowerGrowthPoint,
  FollowersCardProps,
} from "@/types/analytics";
import { accountSeriesKey } from "@/utils/analytics-charts";

function seriesFor(
  points: FollowerGrowthPoint[],
  provider: string,
  providerAccountId: string
): number[] {
  return points
    .filter(
      (point) =>
        point.provider === provider &&
        point.providerAccountId === providerAccountId &&
        point.followersCount !== null
    )
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((point) => point.followersCount ?? 0);
}

function DeltaBadge({ series }: { series: number[] }) {
  const t = useTranslations("analytics.followers");
  const format = useFormatter();
  const first = series.at(0);
  const last = series.at(-1);
  if (first === undefined || last === undefined || series.length < 2) {
    return (
      <span className="text-muted-foreground font-mono text-[0.6875rem] whitespace-nowrap">
        {t("trackingStarted")}
      </span>
    );
  }
  const delta = last - first;
  if (delta === 0) {
    return (
      <span className="text-muted-foreground font-mono text-[0.6875rem]">
        ±0
      </span>
    );
  }
  return (
    <span
      className={cn(
        "font-mono text-[0.6875rem] tabular-nums",
        delta > 0 ? "text-success" : "text-destructive"
      )}
    >
      {delta > 0 ? "▲" : "▼"} {format.number(Math.abs(delta))}
    </span>
  );
}

export function FollowersCard({
  accounts,
  points,
  hiddenKeys,
  colorForKey,
  action,
  markIncompleteTail,
}: FollowersCardProps) {
  const t = useTranslations("analytics.followers");
  const tAnalyticsShared = useTranslations("analytics.shared");
  const formatMetric = useFormatMetric();
  const visible = accounts.filter(
    (account) =>
      !hiddenKeys.has(
        accountSeriesKey(account.provider, account.providerAccountId)
      )
  );

  return (
    <InstrumentModule
      action={action}
      eyebrow={tAnalyticsShared("followers")}
      variant="panel"
    >
      {visible.length === 0 ? (
        <InstrumentEmpty
          className="h-56"
          message={t("noAccounts")}
          seed="Followers"
        />
      ) : (
        <div className="divide-border flex h-56 flex-col justify-center-safe divide-y overflow-y-auto">
          {visible.map((account) => {
            const key = accountSeriesKey(
              account.provider,
              account.providerAccountId
            );
            const series = seriesFor(
              points,
              account.provider,
              account.providerAccountId
            );
            return (
              <div className="flex items-center gap-3 py-2.5" key={key}>
                <Avatar className="size-8 shrink-0">
                  {account.profileImageUrl && (
                    <AvatarImage
                      alt={account.username}
                      src={account.profileImageUrl}
                    />
                  )}
                  <AvatarFallback className="text-[0.625rem]">
                    {account.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-muted-foreground truncate font-mono text-[0.6875rem]">
                    @{account.username}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl tracking-tight tabular-nums">
                      {formatMetric(account.followersCount)}
                    </span>
                    <DeltaBadge series={series} />
                  </div>
                </div>
                {series.length >= 2 && (
                  <div className="ml-auto h-10 w-2/5 min-w-24">
                    <ChartSparkline
                      className="h-full w-full"
                      color={colorForKey(key)}
                      data={series}
                      markIncompleteTail={markIncompleteTail}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </InstrumentModule>
  );
}
