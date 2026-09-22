"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AccountSeriesChartCard } from "@/components/analytics/account-series-chart-card";
import { useAnalyticsAccounts } from "@/components/analytics/analytics-context";
import { FollowersCard } from "@/components/analytics/followers-card";
import { ImpressionsShareCard } from "@/components/analytics/impressions-share-card";
import { PostingPerformanceCard } from "@/components/analytics/posting-performance-card";
import { AnalyticsRangePicker } from "@/components/analytics/range-picker";
import { TopPostsCard } from "@/components/analytics/top-posts-card";
import { InstrumentGrid } from "@/components/instrument/instrument-grid";
import { InstrumentReveal } from "@/components/instrument/instrument-reveal";
import { CHART_MUTED_COLOR } from "@/constants/charts";
import { buildTimelineRange } from "@/lib/analytics/date-range";
import { useAnalyticsRange } from "@/lib/hooks/use-analytics-range";
import {
  useEngagementTimeseries,
  useFollowerGrowth,
  useNotraAdoption,
  usePostingPerformance,
  useTopPosts,
} from "@/lib/hooks/use-social-analytics";
import {
  buildAccountSeriesRows,
  buildAdoptionMarkers,
} from "@/utils/analytics-charts";

const REVEAL_DELAY = 120;

export default function PageClient() {
  const {
    organizationId,
    accounts,
    accountConfig,
    accountColors,
    allKeys,
    hiddenKeys,
    toggleAccount,
    visibleKeys,
  } = useAnalyticsAccounts();

  const engagementRange = useAnalyticsRange("engagementRange");
  const impressionsRange = useAnalyticsRange("impressionsRange");
  const volumeRange = useAnalyticsRange("volumeRange");
  const followersRange = useAnalyticsRange("followersRange");
  const bestTimeRange = useAnalyticsRange("bestTimeRange", "90d");
  const topPostsRange = useAnalyticsRange("topPostsRange");

  const { data: engagement } = useEngagementTimeseries(
    organizationId,
    engagementRange.range
  );
  const { data: impressionSeries } = useEngagementTimeseries(
    organizationId,
    impressionsRange.range
  );
  const { data: volumeSeries } = useEngagementTimeseries(
    organizationId,
    volumeRange.range
  );
  const { data: followerGrowth } = useFollowerGrowth(
    organizationId,
    followersRange.range
  );
  const {
    data: topPosts,
    isPending: isTopPostsPending,
    isPlaceholderData: isTopPostsPlaceholder,
  } = useTopPosts(organizationId, undefined, topPostsRange.range);
  const { data: performance } = usePostingPerformance(
    organizationId,
    bestTimeRange.range
  );
  const { data: adoption } = useNotraAdoption(organizationId);

  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (reduceMotion) {
      setRevealed(true);
      return;
    }
    const timer = setTimeout(() => setRevealed(true), REVEAL_DELAY);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  const engagementTimeline = useMemo(
    () => buildTimelineRange(engagementRange.range),
    [engagementRange.range]
  );
  const impressionsTimeline = useMemo(
    () => buildTimelineRange(impressionsRange.range),
    [impressionsRange.range]
  );
  const volumeTimeline = useMemo(
    () => buildTimelineRange(volumeRange.range),
    [volumeRange.range]
  );

  const engagementRows = useMemo(
    () =>
      buildAccountSeriesRows(
        engagementTimeline,
        visibleKeys,
        engagement?.points ?? [],
        (point) =>
          (point.likes ?? 0) + (point.replies ?? 0) + (point.reposts ?? 0)
      ),
    [engagementTimeline, visibleKeys, engagement?.points]
  );
  const impressionRows = useMemo(
    () =>
      buildAccountSeriesRows(
        impressionsTimeline,
        visibleKeys,
        impressionSeries?.points ?? [],
        (point) => point.impressions ?? 0
      ),
    [impressionsTimeline, visibleKeys, impressionSeries?.points]
  );
  const postRows = useMemo(
    () =>
      buildAccountSeriesRows(
        volumeTimeline,
        visibleKeys,
        volumeSeries?.points ?? [],
        (point) => point.posts
      ),
    [volumeTimeline, visibleKeys, volumeSeries?.points]
  );

  const engagementMarkers = useMemo(
    () => buildAdoptionMarkers(engagementTimeline, adoption),
    [engagementTimeline, adoption]
  );
  const impressionsMarkers = useMemo(
    () => buildAdoptionMarkers(impressionsTimeline, adoption),
    [impressionsTimeline, adoption]
  );
  const volumeMarkers = useMemo(
    () => buildAdoptionMarkers(volumeTimeline, adoption),
    [volumeTimeline, adoption]
  );

  const colorForKey = useCallback(
    (key: string) => accountColors.get(key) ?? CHART_MUTED_COLOR,
    [accountColors]
  );

  return (
    <InstrumentGrid className="grid-cols-1 gap-4 lg:grid-cols-12">
      <InstrumentReveal active={revealed} className="lg:col-span-8" order={0}>
        <AccountSeriesChartCard
          action={<AnalyticsRangePicker control={engagementRange} />}
          allKeys={allKeys}
          config={accountConfig}
          description="Likes, replies and reposts across your accounts"
          emptyMessage="No engagement data for this time frame"
          hero
          hiddenKeys={hiddenKeys}
          kind="area"
          markers={engagementMarkers}
          markIncompleteTail={engagementRange.includesToday}
          onToggleSeries={toggleAccount}
          rows={engagementRows}
          title="Engagement"
        />
      </InstrumentReveal>
      <InstrumentReveal active={revealed} className="lg:col-span-4" order={1}>
        <FollowersCard
          accounts={accounts}
          action={<AnalyticsRangePicker control={followersRange} />}
          colorForKey={colorForKey}
          hiddenKeys={hiddenKeys}
          markIncompleteTail={followersRange.includesToday}
          points={followerGrowth?.points ?? []}
        />
      </InstrumentReveal>
      <InstrumentReveal active={revealed} className="lg:col-span-4" order={2}>
        <ImpressionsShareCard
          colorForKey={colorForKey}
          organizationId={organizationId}
        />
      </InstrumentReveal>
      <InstrumentReveal active={revealed} className="lg:col-span-8" order={3}>
        <AccountSeriesChartCard
          action={<AnalyticsRangePicker control={impressionsRange} />}
          allKeys={allKeys}
          config={accountConfig}
          emptyMessage="No impression data for this time frame"
          hero
          hiddenKeys={hiddenKeys}
          kind="area"
          markers={impressionsMarkers}
          markIncompleteTail={impressionsRange.includesToday}
          onToggleSeries={toggleAccount}
          rows={impressionRows}
          title="Impressions"
        />
      </InstrumentReveal>
      <InstrumentReveal active={revealed} className="lg:col-span-6" order={4}>
        <AccountSeriesChartCard
          action={<AnalyticsRangePicker control={volumeRange} />}
          allKeys={allKeys}
          config={accountConfig}
          emptyMessage="No posts for this time frame"
          hiddenKeys={hiddenKeys}
          kind="bar"
          markers={volumeMarkers}
          markIncompleteTail={volumeRange.includesToday}
          onToggleSeries={toggleAccount}
          rows={postRows}
          title="Publishing volume"
        />
      </InstrumentReveal>
      <InstrumentReveal active={revealed} className="lg:col-span-6" order={5}>
        <PostingPerformanceCard
          action={<AnalyticsRangePicker control={bestTimeRange} />}
          points={performance?.points ?? []}
        />
      </InstrumentReveal>
      <InstrumentReveal active={revealed} className="lg:col-span-12" order={6}>
        <TopPostsCard
          action={<AnalyticsRangePicker control={topPostsRange} />}
          isPending={isTopPostsPending || isTopPostsPlaceholder}
          posts={topPosts?.posts ?? []}
        />
      </InstrumentReveal>
    </InstrumentGrid>
  );
}
