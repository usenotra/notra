"use client";

import { DeviceAccessIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_EMPTY_TRAFFIC_RESPONSE } from "@notra/geo-core/constants/geo";
import {
  toGeoTrafficPreviousTotals,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";
import { trafficLogHostFilter } from "@notra/geo-core/utils/geo-project-domains";
import { AnimatedNumber } from "@notra/ui/components/animated-number";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { useLocale, useTranslations } from "use-intl";

import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { CountryFlag } from "@/components/geo/twemoji";
import { WebBreakdownTable } from "@/components/geo/web-breakdown-table";
import { WebOutcomesTable } from "@/components/geo/web-outcomes-table";
import { WebReferrerIcon } from "@/components/geo/web-referrer-icon";
import { WebTrendChart } from "@/components/geo/web-trend-chart";
import {
  TRAFFIC_HERO_FRAME_CLASS,
  TRAFFIC_HERO_METRIC_CELL_CLASS,
  TRAFFIC_HERO_METRIC_VALUE_CLASS,
  TRAFFIC_HERO_METRICS_GRID_CLASS,
  TRAFFIC_HERO_METRICS_SURFACE_CLASS,
} from "@/constants/geo-traffic-hero";
import { WEB_DEVICE_ICONS, WEB_LIST_LIMIT } from "@/constants/web-analytics";
import type {
  WebBreakdownRow,
  WebMetricProps,
  WebVisitorsSectionProps,
} from "@/types/geo";
import { countryName } from "@/utils/country";
import { formatVisibleDuration, webSourceName } from "@/utils/web-analytics";

function WebMetric({ label, value, previous }: WebMetricProps) {
  const tShared = useTranslations("geo.shared");
  return (
    <div className={TRAFFIC_HERO_METRIC_CELL_CLASS}>
      <p className="text-foreground/75 text-sm leading-5 font-semibold tracking-tight">
        {label}
      </p>
      <div className="flex max-w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 self-start">
        <AnimatedNumber
          className={TRAFFIC_HERO_METRIC_VALUE_CLASS}
          value={value}
        />
        <GeoStatDelta
          delta={trafficVisitDelta(value, previous)}
          hint={tShared("vsPreviousPeriodOfThe")}
          label={label}
        />
      </div>
    </div>
  );
}

function WebTimeMetric({ label, value, previous }: WebMetricProps) {
  const tShared = useTranslations("geo.shared");
  return (
    <div className={TRAFFIC_HERO_METRIC_CELL_CLASS}>
      <p className="text-foreground/75 text-sm leading-5 font-semibold tracking-tight">
        {label}
      </p>
      <div className="flex max-w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 self-start">
        <span className={TRAFFIC_HERO_METRIC_VALUE_CLASS}>
          {value > 0 ? formatVisibleDuration(value) : "-"}
        </span>
        {previous > 0 && value > 0 ? (
          <GeoStatDelta
            delta={trafficVisitDelta(value, previous)}
            hint={tShared("vsPreviousPeriodOfThe")}
            label={label}
          />
        ) : null}
      </div>
    </div>
  );
}

export function WebVisitorsSection({
  web,
  traffic,
  range,
  engagement,
}: WebVisitorsSectionProps) {
  const t = useTranslations("geo.webVisitors");
  const locale = useLocale();
  const { totals } = web;
  const aiTraffic = traffic ?? GEO_EMPTY_TRAFFIC_RESPONSE;
  const previousAi = toGeoTrafficPreviousTotals(
    aiTraffic.sources,
    aiTraffic.previousConversions
  );

  const showPageHost = new Set(web.pages.map((page) => page.host)).size > 1;
  const pageSeconds = new Map(
    (engagement?.pages ?? []).map((page) => [
      `${page.host}${page.path}`,
      page.avgSeconds,
    ])
  );
  const pageRows: WebBreakdownRow[] = web.pages
    .slice(0, WEB_LIST_LIMIT)
    .map((page) => {
      const url = `${page.host}${page.path}`;
      return {
        key: url,
        label: (
          <TruncateWithTooltip tooltip={url}>
            {showPageHost ? (
              <span className="text-muted-foreground">
                {trafficLogHostFilter(page.host)}
              </span>
            ) : null}
            {page.path}
          </TruncateWithTooltip>
        ),
        sortLabel: url,
        value: page.views,
        previous: page.previousViews,
        fromAi: page.aiVisitors,
        avgSeconds: pageSeconds.get(url) ?? null,
      };
    });
  const sourceRows: WebBreakdownRow[] = web.sources
    .slice(0, WEB_LIST_LIMIT)
    .map((source) => {
      const name = webSourceName(source, t("direct"));
      return {
        key: `${source.group}:${source.source}`,
        label: (
          <>
            <WebReferrerIcon source={source} />
            <span className="truncate">{name}</span>
          </>
        ),
        sortLabel: name,
        value: source.sessions,
        previous: source.previousSessions,
      };
    });
  const countryRows: WebBreakdownRow[] = web.countries.map((row) => {
    const name = row.value
      ? countryName(row.value, locale)
      : t("unknownCountry");
    return {
      key: row.value || "unknown",
      label: (
        <>
          {row.value ? (
            <CountryFlag className="size-3.5" code={row.value} />
          ) : null}
          <span className="truncate">{name}</span>
        </>
      ),
      sortLabel: name,
      value: row.visitors,
      previous: row.previousVisitors,
    };
  });
  const deviceLabels: Record<string, string> = {
    desktop: t("deviceDesktop"),
    mobile: t("deviceMobile"),
    tablet: t("deviceTablet"),
  };
  const deviceRows: WebBreakdownRow[] = web.devices.map((row) => {
    const name = deviceLabels[row.value] ?? row.value;
    const icon = Object.hasOwn(WEB_DEVICE_ICONS, row.value)
      ? (WEB_DEVICE_ICONS[row.value] ?? DeviceAccessIcon)
      : DeviceAccessIcon;
    return {
      key: row.value,
      label: (
        <>
          <HugeiconsIcon
            aria-hidden="true"
            className="text-muted-foreground size-3.5 shrink-0"
            icon={icon}
          />
          <span className="truncate">{name}</span>
        </>
      ),
      sortLabel: name,
      value: row.visitors,
      previous: row.previousVisitors,
    };
  });

  return (
    <section className="flex flex-col gap-6">
      <div className={TRAFFIC_HERO_FRAME_CLASS}>
        <div
          className={`${TRAFFIC_HERO_METRICS_GRID_CLASS} ${TRAFFIC_HERO_METRICS_SURFACE_CLASS}`}
        >
          <WebMetric
            label={t("visitors")}
            previous={totals.previousVisitors}
            value={totals.visitors}
          />
          <WebMetric
            label={t("views")}
            previous={totals.previousViews}
            value={totals.views}
          />
          {engagement ? (
            <WebTimeMetric
              label={t("avgTime")}
              previous={engagement.previousAvgSeconds}
              value={engagement.avgSeconds}
            />
          ) : (
            <WebMetric
              label={t("fromAi")}
              previous={totals.previousAiVisitors}
              value={totals.aiVisitors}
            />
          )}
          <WebMetric
            label={t("agents")}
            previous={previousAi?.crawler ?? 0}
            value={aiTraffic.totals.crawler}
          />
        </div>
        <WebTrendChart range={range} traffic={traffic} web={web} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <WebBreakdownTable
          nameHeader={t("page")}
          rows={pageRows}
          showAvgTime={engagement !== undefined}
          showFromAi
          title={t("topPages")}
          valueHeader={t("columnViews")}
        />
        <WebBreakdownTable
          nameHeader={t("columnSource")}
          rows={sourceRows}
          title={t("referrers")}
          valueHeader={t("sessions")}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <WebBreakdownTable
          nameHeader={t("columnCountry")}
          rows={countryRows}
          title={t("countries")}
          valueHeader={t("visitors")}
        />
        <WebBreakdownTable
          nameHeader={t("columnDevice")}
          rows={deviceRows}
          title={t("devices")}
          valueHeader={t("visitors")}
        />
      </div>
      <WebOutcomesTable outcomes={web.outcomes} />
    </section>
  );
}
