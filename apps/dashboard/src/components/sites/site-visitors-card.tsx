"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { trafficVisitDelta } from "@notra/geo-core/utils/ai-traffic";
import { AnimatedNumber } from "@notra/ui/components/animated-number";
import { InstrumentSection } from "@notra/ui/components/instrument/instrument-module";
import { TABLE_BODY_CLASS, TABLE_FRAME_CLASS } from "@notra/ui/constants/table";
import { useTranslations } from "use-intl";

import { buttonVariants } from "@/components/button";
import { ChartSparkline } from "@/components/charts/chart-sparkline";
import Link from "@/components/framework/link";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { useSite } from "@/components/sites/site-context";
import { CHART_PRIMARY_COLOR, CHART_SECONDARY_COLOR } from "@/constants/charts";
import { SITE_OVERVIEW_ANALYTICS_DAYS } from "@/constants/sites";
import { useSiteAnalytics } from "@/lib/hooks/use-sites";
import { cn } from "@/lib/utils";
import { siteHref } from "@/utils/site-links";
import { siteVisitorTrends } from "@/utils/site-visitor-trends";

export function SiteVisitorsCard() {
  const t = useTranslations("sites.analyticsPage");
  const tWeb = useTranslations("geo.webVisitors");
  const tShared = useTranslations("geo.shared");
  const { organizationId, organizationSlug, siteId } = useSite();
  const query = useSiteAnalytics(organizationId, siteId, {
    days: SITE_OVERVIEW_ANALYTICS_DAYS,
  });
  const totals = query.data?.web.totals;
  const agents = query.data?.traffic.totals.crawler ?? 0;
  const trends = query.data
    ? siteVisitorTrends(query.data, SITE_OVERVIEW_ANALYTICS_DAYS)
    : null;
  const stats = [
    {
      key: "visitors",
      label: tWeb("visitors"),
      trend: trends?.visitors,
      color: CHART_PRIMARY_COLOR,
      value: totals?.visitors ?? 0,
      delta: trafficVisitDelta(
        totals?.visitors ?? 0,
        totals?.previousVisitors ?? 0
      ),
    },
    {
      key: "views",
      label: tWeb("views"),
      trend: trends?.views,
      color: CHART_PRIMARY_COLOR,
      value: totals?.views ?? 0,
      delta: trafficVisitDelta(totals?.views ?? 0, totals?.previousViews ?? 0),
    },
    {
      key: "fromAi",
      label: tWeb("fromAi"),
      trend: trends?.fromAi,
      color: CHART_SECONDARY_COLOR,
      value: totals?.aiVisitors ?? 0,
      delta: trafficVisitDelta(
        totals?.aiVisitors ?? 0,
        totals?.previousAiVisitors ?? 0
      ),
    },
    {
      key: "agents",
      label: tWeb("agents"),
      trend: trends?.agents,
      color: CHART_SECONDARY_COLOR,
      value: agents,
      delta: null,
    },
  ];

  return (
    <InstrumentSection
      action={
        <Link
          className={buttonVariants({ size: "sm", variant: "ghost" })}
          href={siteHref(organizationSlug, siteId, "analytics")}
        >
          {t("viewAnalytics")}
          <HugeiconsIcon
            aria-hidden="true"
            data-icon="inline-end"
            icon={ArrowRight01Icon}
            strokeWidth={1.5}
          />
        </Link>
      }
      eyebrow={t("overviewTitle")}
    >
      <div className={TABLE_FRAME_CLASS}>
        <dl
          className={cn(
            TABLE_BODY_CLASS,
            "grid grid-cols-2 overflow-hidden md:grid-cols-4"
          )}
        >
          {stats.map((stat) => (
            <div
              className="border-border/60 relative isolate flex min-w-0 flex-col gap-1.5 overflow-hidden border-b px-4 py-3 odd:border-r nth-[n+3]:border-b-0 md:border-r md:border-b-0 md:last:border-r-0"
              key={stat.key}
            >
              {stat.value > 0 && stat.trend?.some((value) => value > 0) ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 bottom-0 -z-10 h-3/4 w-1/2 opacity-60"
                >
                  <ChartSparkline
                    className="h-full w-full"
                    color={stat.color}
                    data={stat.trend}
                  />
                </div>
              ) : null}
              <dt className="text-muted-foreground text-xs">{stat.label}</dt>
              <dd className="flex items-center gap-2">
                <AnimatedNumber
                  className="text-xl font-semibold tabular-nums"
                  value={stat.value}
                />
                {stat.delta === null ? null : (
                  <GeoStatDelta
                    delta={stat.delta}
                    hint={tShared("vsPreviousPeriodOfThe")}
                    label={stat.label}
                  />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </InstrumentSection>
  );
}
