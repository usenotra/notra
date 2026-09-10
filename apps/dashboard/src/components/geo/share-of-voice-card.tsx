"use client";

import {
  GEO_EMPTY_COMPETITOR_SHARE_TIMESERIES,
  GEO_SHARE_OF_VOICE_TRACKING_HINT,
} from "@notra/geo-core/constants/geo";
import type { ShareOfVoiceRow } from "@notra/geo-core/types/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";

import { ShareOfVoiceTable } from "@/components/geo/share-of-voice-table";
import { InstrumentSection } from "@/components/instrument/instrument-module";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useGeoCompetitorRowNavigation } from "@/lib/hooks/use-geo";
import type { ShareOfVoiceCardProps } from "@/types/geo";
import { isOwnBrandName } from "@/utils/geo-competitors";

export function ShareOfVoiceCard({
  points,
  timeseries = GEO_EMPTY_COMPETITOR_SHARE_TIMESERIES,
  competitors,
  isScanning = false,
  organizationSlug,
  organizationId,
  companyName,
  aliases,
}: ShareOfVoiceCardProps) {
  const navigation = useGeoCompetitorRowNavigation(
    organizationSlug,
    organizationId
  );
  const openRow = (row: ShareOfVoiceRow) => {
    trackEvent(POSTHOG_EVENTS.GEO_SHARE_OF_VOICE_SLICE_CLICKED, {
      is_own_brand:
        row.kind === "brand" && isOwnBrandName(row.brand, companyName, aliases),
      is_other: row.kind === "aggregate",
      share: row.share,
      mentions: row.mentions,
    });
    navigation.openRow(row.brand, row.kind === "aggregate");
  };
  const prefetchRow = (row: ShareOfVoiceRow) =>
    navigation.prefetchRow(row.brand, row.kind === "aggregate");

  return (
    <InstrumentSection
      bodyClassName="flex min-h-0 flex-1 flex-col"
      className="h-full"
      eyebrow="Share of voice"
      hint={GEO_SHARE_OF_VOICE_TRACKING_HINT}
    >
      <ShareOfVoiceTable
        aliases={aliases}
        companyName={companyName}
        competitors={competitors}
        isScanning={isScanning}
        onRowClick={organizationSlug ? openRow : undefined}
        onRowPointerEnter={organizationSlug ? prefetchRow : undefined}
        points={points}
        timeseries={timeseries}
      />
    </InstrumentSection>
  );
}
