"use client";

import type { ShareOfVoiceRow } from "@notra/geo-core/types/geo";

import { ShareOfVoiceChart } from "@/components/geo/share-of-voice-chart";
import { useGeoCompetitorRowNavigation } from "@/lib/hooks/use-geo";
import type { CompetitorShareCardProps } from "@/types/geo";

export function CompetitorShareCard({
  points,
  timeseries,
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
    <ShareOfVoiceChart
      aliases={aliases}
      companyName={companyName}
      competitors={competitors}
      isScanning={isScanning}
      onSliceClick={organizationSlug ? openRow : undefined}
      onSlicePointerEnter={organizationSlug ? prefetchRow : undefined}
      organizationId={organizationId}
      points={points}
      timeseries={timeseries}
    />
  );
}
