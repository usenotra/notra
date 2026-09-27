"use client";

import type { ShareOfVoiceRow } from "@notra/geo-core/types/geo";
import { useTranslations } from "next-intl";

import { ShareOfVoiceChart } from "@/components/geo/share-of-voice-chart";
import { InstrumentSection } from "@/components/instrument/instrument-module";
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
  const t = useTranslations("geo.competitorShareCard");
  const tGeoShared = useTranslations("geo.shared");
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
      description={t("description")}
      eyebrow={tGeoShared("shareOfVoice")}
      hint={tGeoShared("discoveredBrandsComeFromScan")}
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
        timeseries={timeseries}
      />
    </InstrumentSection>
  );
}
