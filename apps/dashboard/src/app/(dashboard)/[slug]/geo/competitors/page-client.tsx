"use client";

import { PlusSignIcon, Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useHotkey } from "@tanstack/react-hotkeys";
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

import { GeoPageSkeleton } from "../skeleton";

const CompetitorShareCard = dynamic(
  () =>
    import("@/components/geo/competitor-share-card").then(
      (module) => module.CompetitorShareCard
    ),
  {
    loading: () => (
      <GeoSectionSkeleton eyebrow="Share of voice">
        <Skeleton className="h-64 w-full rounded-xl" />
      </GeoSectionSkeleton>
    ),
    ssr: false,
  }
);

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const geoRange = useGeoRange();
  const { data: settingsData, isPending } = useGeoSettings(organizationId);
  const { data: competitorShare } = useGeoCompetitorShare(
    organizationId,
    geoRange.query,
    true
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
    return <GeoPageSkeleton />;
  }

  const settings = settingsData?.settings ?? null;

  if (!settings) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Competitors</h1>
            <p className="text-muted-foreground">
              Who AI engines recommend instead of you
            </p>
          </header>
          <EmptyState
            action={<GeoSetupButton organizationId={organizationId} />}
            description="Set up GEO tracking first, then track which competitors AI engines surface."
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.competitors}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title="Not set up yet"
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Competitors</h1>
            <p className="text-muted-foreground">
              Who AI engines recommend instead of you
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GeoRangePicker control={geoRange} />
            <Button
              className="gap-1.5"
              onClick={() => setImportOpen(true)}
              variant="outline"
            >
              <HugeiconsIcon className="size-4" icon={Upload01Icon} />
              Import CSV
            </Button>
            <Button className="gap-1.5" onClick={() => setManagerOpen(true)}>
              <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
              Add Competitor
              <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
            </Button>
          </div>
        </header>
        <CompetitorsTable
          aliases={settings.aliases}
          companyName={settings.companyName}
          competitors={competitors}
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
