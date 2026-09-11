"use client";

import dynamic from "next/dynamic";

import { Button } from "@/components/button";
import { GeoGapsTable } from "@/components/geo/gaps-table";
import { GeoWriterNeedsSetup } from "@/components/geo/writer/page-gate";
import { PageContainer } from "@/components/layout/container";
import { GeoProjectProvider } from "@/components/providers/geo-project-provider";
import { GEO_WRITE_DIALOG_ENTRIES } from "@/constants/geo-analytics";
import { useGeoGapsPage } from "@/lib/hooks/use-geo-gaps-page";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import type { GeoPageClientProps } from "@/types/geo";

import { GeoGapsSkeleton } from "./skeleton";

const WriteDialog = dynamic(() =>
  import("@/components/geo/writer/write-dialog").then(
    (module) => module.WriteDialog
  )
);

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  const [projectParam] = useGeoProjectQueryState();

  return (
    <GeoProjectProvider projectId={projectParam ?? undefined}>
      <GeoGapsPageContent organizationSlug={organizationSlug} />
    </GeoProjectProvider>
  );
}

function GeoGapsPageContent({ organizationSlug }: GeoPageClientProps) {
  const page = useGeoGapsPage(organizationSlug);

  if (page.status === "error") {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:py-6">
        <div className="space-y-4 px-4 lg:px-6" role="alert">
          <h1 className="text-3xl font-bold tracking-tight">Content Gaps</h1>
          <p className="text-muted-foreground">
            We couldn&apos;t load content gaps. Try again.
          </p>
          <Button
            disabled={page.isRetrying}
            onClick={page.retry}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (page.status === "setup") {
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

        {page.gapsQuery.isPending ? (
          <GeoGapsSkeleton embedded />
        ) : (
          <GeoGapsTable
            competitors={page.competitors}
            dismissingSearchId={
              page.dismissSuggestion.isPending
                ? (page.dismissSuggestion.variables?.suggestionId ?? null)
                : null
            }
            hasScanData={page.gapsQuery.data?.hasScanData ?? false}
            isScanning={page.isScanning}
            onDismissSearch={(row) => page.dismissSearch(row.id)}
            onOpenPost={page.openPost}
            onRescanPrompt={(row) => page.rescanPromptRow(row.id)}
            onRunScan={page.runScan}
            onWritePrompt={page.writePrompt}
            onWriteSearch={page.writeSearch}
            organizationSlug={page.organizationSlug}
            promptGaps={page.gapsQuery.data?.promptGaps ?? []}
            searchGaps={page.gapsQuery.data?.searchGaps ?? []}
          />
        )}
      </div>

      {page.dialogInitial ? (
        <WriteDialog
          entry={GEO_WRITE_DIALOG_ENTRIES.GAP}
          initial={page.dialogInitial}
          onOpenChange={page.setDialogOpen}
          open={page.dialogOpen}
          organizationId={page.organizationId}
          organizationSlug={page.organizationSlug}
        />
      ) : null}
    </PageContainer>
  );
}
