"use client";

import dynamic from "next/dynamic";

import { Button } from "@/components/button";
import { GeoGapsTable } from "@/components/geo/gaps-table";
import { GeoWriterNeedsSetup } from "@/components/geo/writer/page-gate";
import { PageContainer } from "@/components/layout/container";
import { GEO_WRITE_DIALOG_ENTRIES } from "@/constants/geo-analytics";
import { useGeoGapsPage } from "@/lib/hooks/use-geo-gaps-page";
import type {
  GeoGapsLoadErrorProps,
  GeoGapsLoadedProps,
} from "@/types/components/geo-gaps";
import type { GeoPageClientProps } from "@/types/geo";

import { GeoGapsSkeleton } from "./skeleton";

const WriteDialog = dynamic(() =>
  import("@/components/geo/writer/write-dialog").then(
    (module) => module.WriteDialog
  )
);

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  return <GeoGapsPageContent organizationSlug={organizationSlug} />;
}

function GeoGapsPageContent({ organizationSlug }: GeoPageClientProps) {
  const page = useGeoGapsPage(organizationSlug);

  if (page.status === "error") {
    return (
      <GeoGapsLoadError isRetrying={page.isRetrying} onRetry={page.onRetry} />
    );
  }

  if (page.status === "empty") {
    return (
      <GeoWriterNeedsSetup
        description="Questions engines answer without mentioning you"
        organizationId={page.organizationId}
        title="Content Gaps"
      />
    );
  }

  if (page.status === "loading") {
    return <GeoGapsSkeleton />;
  }

  return <GeoGapsLoaded page={page} />;
}

function GeoGapsLoadError({ isRetrying, onRetry }: GeoGapsLoadErrorProps) {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:py-6">
      <div className="space-y-4 px-4 lg:px-6" role="alert">
        <h1 className="text-3xl font-bold tracking-tight">Content Gaps</h1>
        <p className="text-muted-foreground">
          We couldn&apos;t load content gaps. Try again.
        </p>
        <Button disabled={isRetrying} onClick={onRetry} variant="outline">
          Retry
        </Button>
      </div>
    </PageContainer>
  );
}

function GeoGapsLoaded({ page }: GeoGapsLoadedProps) {
  return (
    <PageContainer
      className="flex h-full min-h-full flex-1 flex-col overflow-hidden py-4 md:py-6"
      data-geo-gaps-page=""
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-6 px-4 lg:px-6">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Content Gaps</h1>
            <p className="text-muted-foreground">
              Questions engines answer without mentioning you
            </p>
          </div>
        </header>

        {page.isGapsPending ? (
          <GeoGapsSkeleton embedded />
        ) : (
          <GeoGapsTable {...page.table} />
        )}
      </div>

      {page.organizationId && page.dialog.initial ? (
        <WriteDialog
          entry={GEO_WRITE_DIALOG_ENTRIES.GAP}
          initial={page.dialog.initial}
          onOpenChange={page.dialog.onOpenChange}
          open={page.dialog.open}
          organizationId={page.organizationId}
          organizationSlug={page.organizationSlug}
        />
      ) : null}
    </PageContainer>
  );
}
