"use client";

import { isTrafficPagePending } from "@notra/geo-core/utils/ai-traffic";
import {
  ingestAllowedHosts,
  unionTrafficHosts,
} from "@notra/geo-core/utils/geo-project-domains";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { useEffect, useRef } from "react";
import { useTranslations } from "use-intl";

import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { AiTrafficCard } from "@/components/geo/ai-traffic-card";
import { AiTrafficLogCard } from "@/components/geo/ai-traffic-log-card";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { GeoSetupButton } from "@/components/geo/geo-setup-button";
import { TrafficDomainSelect } from "@/components/geo/traffic-domain-select";
import { TrafficEmpty } from "@/components/geo/traffic-empty";
import { TrafficPagesCard } from "@/components/geo/traffic-pages-card";
import { WebVisitorsSection } from "@/components/geo/web-visitors-section";
import { PageContainer } from "@/components/layout/container";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useAiTraffic,
  useGeoIngestSetup,
  useGeoSettings,
  useGeoTrafficPages,
  useWebAnalytics,
} from "@/lib/hooks/use-geo";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import { useGeoTrafficHostQuery } from "@/lib/hooks/use-geo-traffic-host";
import type { GeoPageClientProps, TrafficPageViewProps } from "@/types/geo";
import { trafficHostsFromPages } from "@/utils/ai-traffic-pages";
import { withGeoProject } from "@/utils/geo-paths";
import { geoSettingsPath } from "@/utils/settings-path";
import { hasWebAnalytics, webHostsForSelect } from "@/utils/web-analytics";

import { GeoTrafficSkeleton } from "./skeleton";

function TrafficPageView({
  organizationId,
  organizationSlug,
  projectId,
  settings,
  isEmptyTraffic,
  geoRange,
  traffic,
  isTrafficPending,
  knownHosts,
  isPagesPending,
  trafficPages,
  ingestSetup,
  web,
}: TrafficPageViewProps) {
  const t = useTranslations("geo.pages.traffic");
  const tShared = useTranslations("geo.pages.shared");
  if (!settings) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full min-w-0 space-y-6 px-4 lg:px-6">
          <PageHeading description={t("description")} title={t("title")} />
          <EmptyState
            action={<GeoSetupButton organizationId={organizationId} />}
            description={t("setupDescription")}
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.traffic}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title={tShared("notSetUpTitle")}
          />
        </div>
      </PageContainer>
    );
  }

  const showVisitors = hasWebAnalytics(web);

  const header = (
    <PageHeading
      description={
        showVisitors ? t("descriptionWithVisitors") : t("description")
      }
      title={showVisitors ? t("titleWithVisitors") : t("title")}
    >
      <div className="flex max-w-full flex-wrap items-center gap-3">
        <TrafficDomainSelect hosts={knownHosts} />
        <GeoRangePicker control={geoRange} />
      </div>
    </PageHeading>
  );

  if (isEmptyTraffic) {
    const hasPreviousTraffic =
      traffic?.sources.some((source) => (source.previousVisits ?? 0) > 0) ||
      (web?.totals.previousViews ?? 0) > 0;
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex w-full min-w-0 flex-col gap-6 px-4 lg:px-6">
          {header}
          {hasPreviousTraffic ? (
            <EmptyState
              description={t("emptyRangeDescription")}
              title={t("emptyRangeTitle")}
            />
          ) : (
            <TrafficEmpty setup={ingestSetup} />
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        {header}
        <div className="flex flex-col gap-6">
          {showVisitors && web ? (
            <WebVisitorsSection
              range={geoRange.query}
              traffic={traffic}
              web={web}
            />
          ) : null}
          <AiTrafficCard
            isPending={isTrafficPending}
            pages={trafficPages}
            range={geoRange.query}
            settingsHref={withGeoProject(
              geoSettingsPath(organizationSlug),
              projectId
            )}
            showHero={!(showVisitors && web)}
            traffic={traffic}
          />
          <TrafficPagesCard isPending={isPagesPending} pages={trafficPages} />
          <AiTrafficLogCard organizationId={organizationId} />
        </div>
      </div>
    </PageContainer>
  );
}

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  const { projectId } = useGeoProjectScope();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";
  const { domain: brandDomain } = useGeoActiveProject(organizationId);

  const geoRange = useGeoRange();
  const [hostQuery] = useGeoTrafficHostQuery();
  const { data: settingsData, isPending: isSettingsPending } =
    useGeoSettings(organizationId);
  const {
    data: traffic,
    isPending: isTrafficPending,
    isPlaceholderData: isTrafficPlaceholder,
  } = useAiTraffic(organizationId, geoRange.query, hostQuery);
  const { data: web, isPending: isWebPending } = useWebAnalytics(
    organizationId,
    geoRange.query,
    hostQuery
  );
  const { data: ingestSetup, isPending: isIngestPending } =
    useGeoIngestSetup(organizationId);
  const inventoryPages = useGeoTrafficPages(organizationId, geoRange.query);
  const {
    data: trafficPages,
    isPending: isPagesPending,
    isPlaceholderData: isPagesPlaceholder,
  } = useGeoTrafficPages(organizationId, geoRange.query, hostQuery);
  const knownHosts = unionTrafficHosts(
    ingestAllowedHosts(brandDomain, settingsData?.settings?.domains),
    [
      ...trafficHostsFromPages(inventoryPages.data?.pages ?? []),
      ...webHostsForSelect(web),
    ]
  );

  const settings = settingsData?.settings ?? null;
  const sources = traffic?.sources ?? [];
  const isEmptyTraffic =
    !isTrafficPending &&
    !isWebPending &&
    !sources.some((source) => source.visits > 0) &&
    (web?.totals.views ?? 0) === 0;
  const showSkeleton = isTrafficPagePending({
    isSettingsPending,
    hasSettings: settings !== null,
    isTrafficPending: isTrafficPending || isTrafficPlaceholder,
    isEmptyTraffic,
    isIngestPending,
  });

  const ready = !showSkeleton;

  const viewedRef = useRef(false);
  const hasSettings = settings !== null;
  const rangePreset = geoRange.preset;

  useEffect(() => {
    if (viewedRef.current || !ready) {
      return;
    }
    viewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.TRAFFIC_VIEWED, {
      has_traffic: hasSettings && !isEmptyTraffic,
      has_settings: hasSettings,
      range: rangePreset,
    });
  }, [hasSettings, isEmptyTraffic, rangePreset, ready]);

  if (showSkeleton) {
    return <GeoTrafficSkeleton geoRange={geoRange} />;
  }

  return (
    <TrafficPageView
      geoRange={geoRange}
      ingestSetup={ingestSetup}
      isEmptyTraffic={isEmptyTraffic}
      isPagesPending={isPagesPending || isPagesPlaceholder}
      isTrafficPending={isTrafficPending || isTrafficPlaceholder}
      knownHosts={knownHosts}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
      projectId={projectId}
      settings={settings}
      traffic={traffic}
      trafficPages={trafficPages?.pages ?? []}
      web={web}
    />
  );
}
