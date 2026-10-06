"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { trafficVisitDelta } from "@notra/geo-core/utils/ai-traffic";
import { AnimatedNumber } from "@notra/ui/components/animated-number";
import { InstrumentSection } from "@notra/ui/components/instrument/instrument-module";
import { useTranslations } from "use-intl";

import { buttonVariants } from "@/components/button";
import Link from "@/components/framework/link";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { useSite } from "@/components/sites/site-context";
import { SITE_OVERVIEW_ANALYTICS_DAYS } from "@/constants/sites";
import { useSiteAnalytics } from "@/lib/hooks/use-sites";
import { siteHref } from "@/utils/site-links";

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
  const stats = [
    {
      key: "visitors",
      label: tWeb("visitors"),
      value: totals?.visitors ?? 0,
      delta: trafficVisitDelta(
        totals?.visitors ?? 0,
        totals?.previousVisitors ?? 0
      ),
    },
    {
      key: "views",
      label: tWeb("views"),
      value: totals?.views ?? 0,
      delta: trafficVisitDelta(totals?.views ?? 0, totals?.previousViews ?? 0),
    },
    {
      key: "fromAi",
      label: tWeb("fromAi"),
      value: totals?.aiVisitors ?? 0,
      delta: trafficVisitDelta(
        totals?.aiVisitors ?? 0,
        totals?.previousAiVisitors ?? 0
      ),
    },
    { key: "agents", label: tWeb("agents"), value: agents, delta: null },
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
      <dl className="border-shell-border bg-shell grid grid-cols-2 overflow-hidden rounded-2xl border md:grid-cols-4">
        {stats.map((stat) => (
          <div
            className="border-border flex min-w-0 flex-col gap-1.5 border-b px-4 py-3 odd:border-r md:border-r md:border-b-0 md:last:border-r-0"
            key={stat.key}
          >
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
    </InstrumentSection>
  );
}
