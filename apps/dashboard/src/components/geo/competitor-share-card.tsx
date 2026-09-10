"use client";

import { GEO_SHARE_OF_VOICE_TRACKING_HINT } from "@notra/geo-core/constants/geo";
import type { ShareOfVoiceRow } from "@notra/geo-core/types/geo";

import { ShareOfVoiceChart } from "@/components/geo/share-of-voice-chart";
import { InstrumentSection } from "@/components/instrument/instrument-module";
import { useGeoCompetitorRowNavigation } from "@/lib/hooks/use-geo";
import type { CompetitorShareCardProps } from "@/types/geo";

export function CompetitorShareCard({
  points,
  companyName,
  aliases,
  competitors,
  isScanning = false,
  organizationSlug,
  organizationId,
}: CompetitorShareCardProps) {
  const navigation = useGeoCompetitorRowNavigation(
    organizationSlug,
    organizationId
  );

  const openRow = (row: ShareOfVoiceRow) => {
    if (row.kind === "aggregate") {
      return;
    }
    navigation.openRow(row.brand);
  };

  const prefetchRow = (row: ShareOfVoiceRow) => {
    if (row.kind === "aggregate") {
      return;
    }
    navigation.prefetchRow(row.brand);
  };

  return (
    <InstrumentSection
      description="Your share of AI mentions compared with other brands."
      eyebrow="Share of voice"
      hint={GEO_SHARE_OF_VOICE_TRACKING_HINT}
    >
      <ShareOfVoiceChart
        aliases={aliases}
        companyName={companyName}
        competitors={competitors}
        isScanning={isScanning}
        onSliceClick={organizationSlug ? openRow : undefined}
        onSlicePointerEnter={organizationSlug ? prefetchRow : undefined}
        organizationId={organizationId}
        points={points}
      />
    </InstrumentSection>
  );
}
