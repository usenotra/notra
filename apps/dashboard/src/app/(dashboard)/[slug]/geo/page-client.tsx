"use client";

import { Kbd } from "@notra/ui/components/ui/kbd";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/button";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { GeoSetupEmpty } from "@/components/geo/geo-setup-empty";
import { ScanPreflightDialog } from "@/components/geo/scan-preflight-dialog";
import { PageContainer } from "@/components/layout/container";
import { GeoProjectProvider } from "@/components/providers/geo-project-provider";
import { useGeoOverviewPage } from "@/lib/hooks/use-geo-overview-page";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import type {
  GeoOverviewLoadedProps,
  GeoPageClientProps,
  GeoPageContentProps,
  GeoScanSpinnerProps,
} from "@/types/geo";

import { GeoTabs } from "./components/geo-tabs";
import { GeoPageSkeleton } from "./skeleton";

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  const [projectParam] = useGeoProjectQueryState();

  return (
    <GeoProjectProvider projectId={projectParam ?? undefined}>
      <GeoPageContent organizationSlug={organizationSlug} />
    </GeoProjectProvider>
  );
}

function GeoPageContent({ organizationSlug }: GeoPageContentProps) {
  const page = useGeoOverviewPage(organizationSlug);

  if (page.status === "loading") {
    return <GeoPageSkeleton />;
  }

  if (page.status === "empty") {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full px-4 lg:px-6">
          <GeoSetupEmpty organizationId={page.organizationId} page="overview" />
        </div>
      </PageContainer>
    );
  }

  return <GeoOverviewLoaded page={page} />;
}

function GeoOverviewLoaded({ page }: GeoOverviewLoadedProps) {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">GEO</h1>
            <p className="text-muted-foreground">
              How AI engines talk about {page.companyName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GeoRangePicker control={page.geoRange} />
            <Button
              className="w-fit gap-2"
              disabled={page.isScanning}
              onClick={page.onRunScan}
              size="sm"
            >
              <span className="inline-flex items-center gap-1.5">
                <GeoScanSpinner visible={page.isScanning} />
                Run Scan
              </span>
              <Kbd className="hidden sm:inline-flex">R</Kbd>
            </Button>
          </div>
        </header>

        <GeoTabs {...page.tabs} />
      </div>
      <ScanPreflightDialog {...page.scanPreflight} />
    </PageContainer>
  );
}

function GeoScanSpinner({ visible }: GeoScanSpinnerProps) {
  if (!visible) {
    return null;
  }

  return <Loader2Icon className="size-4 animate-spin" />;
}
