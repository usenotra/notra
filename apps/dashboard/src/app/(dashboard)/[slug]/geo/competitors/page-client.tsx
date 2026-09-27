"use client";

import { PlusSignIcon, Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { CompetitorEditDialog } from "@/components/geo/competitor-edit-dialog";
import { CompetitorsTable } from "@/components/geo/competitors-table";
import { CompetitorsCsvImportDialog } from "@/components/geo/geo-csv-import-dialog";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { GeoSetupButton } from "@/components/geo/geo-setup-button";
import { GeoSectionSkeleton } from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  useGeoCompetitorShare,
  useGeoSettings,
  useIsGeoScanning,
} from "@/lib/hooks/use-geo";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import type { GeoRangeControl } from "@/types/geo";

import { GeoCompetitorsSkeleton } from "./skeleton";

const CompetitorShareCard = dynamic(
  () =>
    import("@/components/geo/competitor-share-card").then(
      (module) => module.CompetitorShareCard
    ),
  {
    loading: () => <CompetitorShareCardLoading />,
    ssr: false,
  }
);

function CompetitorShareCardLoading() {
  const tGeoShared = useTranslations("geo.shared");
  return (
    <GeoSectionSkeleton eyebrow={tGeoShared("shareOfVoice")}>
      <Skeleton className="h-64 w-full rounded-xl" />
    </GeoSectionSkeleton>
  );
}

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const t = useTranslations("geo.pages.competitors");
  const tCommon = useTranslations("common");
  const tShared = useTranslations("geo.pages.shared");
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const geoRange = useGeoRange();
  const { data: settingsData, isPending } = useGeoSettings(organizationId);
  // Full response: the share-of-voice change indicators need the daily
  // mention timeseries, which the summary-only variant leaves out.
  const { data: competitorShare } = useGeoCompetitorShare(
    organizationId,
    geoRange.query
  );
  const { competitors } = useGeoCompetitorsDb(organizationId);
  const { domain: ownDomain } = useGeoActiveProject(organizationId);
  const isScanning = useIsGeoScanning(organizationId);
  const [managerOpen, setManagerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useHotkey("C", () => setManagerOpen(true), {
    enabled: !managerOpen && !importOpen,
  });

  if (isPending) {
    return <GeoCompetitorsSkeleton />;
  }

  const settings = settingsData?.settings ?? null;

  if (!settings) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <PageHeading
            description={t("description")}
            title={tCommon("labels.competitors")}
          />
          <EmptyState
            action={<GeoSetupButton organizationId={organizationId} />}
            description={t("setupDescription")}
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.competitors}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title={tShared("notSetUpTitle")}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon("labels.competitors")}
        >
          <CompetitorsHeadingActions
            geoRange={geoRange}
            onAdd={() => setManagerOpen(true)}
            onImport={() => setImportOpen(true)}
          />
        </PageHeading>
        <CompetitorsTable
          aliases={settings.aliases}
          companyName={settings.companyName}
          competitors={competitors}
          isScanning={isScanning}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          ownDomain={ownDomain}
        />
        <CompetitorShareCard
          aliases={settings.aliases}
          companyName={settings.companyName}
          competitors={competitors}
          isScanning={isScanning}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          points={competitorShare?.points ?? []}
          timeseries={competitorShare?.timeseries ?? []}
        />
      </div>
      <CompetitorEditDialog
        competitor={null}
        onOpenChange={setManagerOpen}
        open={managerOpen}
        organizationId={organizationId}
      />
      <CompetitorsCsvImportDialog
        onOpenChange={setImportOpen}
        open={importOpen}
        organizationId={organizationId}
      />
    </PageContainer>
  );
}

function CompetitorsHeadingActions({
  geoRange,
  onAdd,
  onImport,
}: {
  geoRange: GeoRangeControl;
  onAdd: () => void;
  onImport: () => void;
}) {
  const tGeoShared2 = useTranslations("geo.shared");
  const tShared = useTranslations("geo.pages.shared");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <GeoRangePicker control={geoRange} />
      <Button className="gap-1.5" onClick={onImport} variant="outline">
        <HugeiconsIcon className="size-4" icon={Upload01Icon} />
        {tShared("importCsv")}
      </Button>
      <Button className="gap-1.5" onClick={onAdd}>
        <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
        {tGeoShared2("addCompetitor")}
        <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
      </Button>
    </div>
  );
}
