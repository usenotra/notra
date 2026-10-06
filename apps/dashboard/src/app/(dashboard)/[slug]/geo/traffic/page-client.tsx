"use client";

import { isTrafficPagePending } from "@notra/geo-core/utils/ai-traffic";
import {
  ingestAllowedHosts,
  unionTrafficHosts,
} from "@notra/geo-core/utils/geo-project-domains";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useEffect, useRef } from "react";
import { useTranslations } from "use-intl";

import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { AiTrafficCard } from "@/components/geo/ai-traffic-card";
import { AiTrafficLogCard } from "@/components/geo/ai-traffic-log-card";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { GeoSetupButton } from "@/components/geo/geo-setup-button";
import { TrafficEmpty } from "@/components/geo/traffic-empty";
import { TrafficPagesCard } from "@/components/geo/traffic-pages-card";
import { PageContainer } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
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
} from "@/lib/hooks/use-geo";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import { useGeoTrafficHostQuery } from "@/lib/hooks/use-geo-traffic-host";
import type { GeoPageClientProps, TrafficPageViewProps } from "@/types/geo";
import { trafficHostsFromPages } from "@/utils/ai-traffic-pages";
import { withGeoProject } from "@/utils/geo-paths";
import { geoSettingsPath } from "@/utils/settings-path";

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
  inventoryPages,
  knownHosts,
  isPagesPending,
  trafficPages,
  ingestSetup,
}: TrafficPageViewProps) {
  const t = useTranslations("geo.pages.traffic");
  const tShared = useTranslations("geo.pages.shared");
  if (!settings) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full min-w-0 space-y-6 px-4 lg:px-6">
          <PageHeader description={t("description")} title={t("title")} />
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

  const header = (
    <PageHeader description={t("description")} title={t("title")}>
      <div className="flex items-center gap-2">
        <GeoRangePicker control={geoRange} />
      </div>
    </PageHeader>
  );

  if (isEmptyTraffic) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex w-full min-w-0 flex-col gap-6 px-4 lg:px-6">
          {header}
          <TrafficEmpty setup={ingestSetup} />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        {header}
        <div className="flex flex-col gap-6">
          <AiTrafficCard
            isPending={isTrafficPending}
            pages={inventoryPages}
            range={geoRange.query}
            settingsHref={withGeoProject(
              geoSettingsPath(organizationSlug),
              projectId
            )}
            traffic={traffic}
          />
          <TrafficPagesCard
            hosts={knownHosts}
            isPending={isPagesPending}
            pages={trafficPages}
          />
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
  } = useAiTraffic(organizationId, geoRange.query);
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
    trafficHostsFromPages(inventoryPages.data?.pages ?? [])
  );

  const settings = settingsData?.settings ?? null;
  const sources = traffic?.sources ?? [];
  const isEmptyTraffic = !isTrafficPending && sources.length === 0;
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
      inventoryPages={inventoryPages.data?.pages ?? []}
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
    />
  );
}
