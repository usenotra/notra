"use client";

import {
  GEO_EMPTY_TRAFFIC_RESPONSE,
  GEO_TRAFFIC_OTHER_GROUP,
} from "@notra/geo-core/constants/geo";
import {
  buildTrafficTrendRows,
  hasTrafficSourceSeries,
  toGeoTrafficPreviousTotals,
  trafficSparklineDays,
} from "@notra/geo-core/utils/ai-traffic";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@notra/ui/components/instrument/instrument-module";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { TrafficHero } from "@/components/geo/traffic-hero";
import { TrafficSourceSheet } from "@/components/geo/traffic-source-sheet";
import { TrafficSourcesStack } from "@/components/geo/traffic-sources-group";
import { useTrafficSourceColumns } from "@/lib/hooks/use-traffic-source-columns";
import type {
  AiTrafficCardProps,
  GeoTrafficSourceBand,
  GeoTrafficSourceGroup,
} from "@/types/geo";
import {
  buildTrafficGroupSeries,
  groupTrafficSources,
  trafficGroupKey,
} from "@/utils/ai-traffic-groups";

export function AiTrafficCard({
  traffic,
  pages,
  range,
  settingsHref,
  isPending = false,
}: AiTrafficCardProps) {
  const tCommon = useTranslations("common");
  const tShared = useTranslations("geo.shared");
  const locale = useLocale();
  const { sources, totals, points, previousConversions } =
    traffic ?? GEO_EMPTY_TRAFFIC_RESPONSE;
  const previousTotals = toGeoTrafficPreviousTotals(
    sources,
    previousConversions
  );
  const groups = groupTrafficSources(sources).map((group) =>
    group.key === GEO_TRAFFIC_OTHER_GROUP.key
      ? { ...group, label: tCommon("labels.other") }
      : group
  );
  const [collapsed, setCollapsed] = useState<ReadonlySet<GeoTrafficSourceBand>>(
    () => new Set()
  );
  const toggleCollapsed = (band: GeoTrafficSourceBand) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(band)) {
        next.delete(band);
      } else {
        next.add(band);
      }
      return next;
    });
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const sparklineDays = useMemo(
    () => trafficSparklineDays(points, range?.from, range?.to),
    [points, range?.from, range?.to]
  );
  const trendRows = buildTrafficTrendRows(points, locale, sparklineDays);
  const canSparkline = hasTrafficSourceSeries(points);
  const seriesByGroup = useMemo(() => {
    const map = new Map<string, { day: string; value: number }[]>();
    if (!canSparkline) {
      return map;
    }

    for (const group of groups) {
      const values = buildTrafficGroupSeries(points, group, sparklineDays);
      map.set(
        trafficGroupKey(group.band, group.key),
        sparklineDays.map((day, index) => ({
          day,
          value: values[index] ?? 0,
        }))
      );
    }

    return map;
  }, [canSparkline, groups, points, sparklineDays]);

  const openGroup =
    openGroupKey === null
      ? null
      : (groups.find(
          (group) => trafficGroupKey(group.band, group.key) === openGroupKey
        ) ?? null);

  const columns = useTrafficSourceColumns({ seriesByKey: seriesByGroup });

  if (sources.length === 0) {
    return (
      <InstrumentSection eyebrow={tCommon("labels.sources")}>
        <InstrumentEmpty
          message={tShared("noAiTrafficCapturedYet")}
          seed="geo-traffic-sources"
        />
      </InstrumentSection>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TrafficHero
        groups={groups}
        points={points}
        previousTotals={previousTotals}
        rows={trendRows}
        settingsHref={settingsHref}
        totals={totals}
      />
      <InstrumentSection eyebrow={tCommon("labels.sources")}>
        <TrafficSourcesStack
          collapsed={collapsed}
          columns={columns}
          groups={groups}
          loading={isPending}
          onOpen={(group) =>
            setOpenGroupKey(trafficGroupKey(group.band, group.key))
          }
          onToggle={toggleCollapsed}
        />
      </InstrumentSection>
      <TrafficSourceSheet
        group={openGroup}
        onOpenChange={(open) => {
          if (!open) {
            setOpenGroupKey(null);
          }
        }}
        pages={pages}
        series={openGroupKey ? (seriesByGroup.get(openGroupKey) ?? []) : []}
      />
    </div>
  );
}
