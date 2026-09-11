"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { useHotkey } from "@tanstack/react-hotkeys";
import Link from "next/link";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { ShelfAddDialog } from "@/components/geo/shelf/shelf-add-dialog";
import { ShelfDetailDialog } from "@/components/geo/shelf/shelf-detail-dialog";
import { ShelfPageControls } from "@/components/geo/shelf/shelf-page-controls";
import { ShelfView } from "@/components/geo/shelf/shelf-view";
import { PageContainer } from "@/components/layout/container";
import { GeoProjectProvider } from "@/components/providers/geo-project-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  GEO_SHELF_ADD_HOTKEY,
  GEO_SHELF_ADD_LABEL,
} from "@/constants/geo-shelf";
import { useGeoShelfPage } from "@/lib/hooks/use-geo-shelf-page";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import type { GeoPageClientProps } from "@/types/geo";
import { withGeoProject } from "@/utils/geo-paths";
import { buildOptimisticShelfSource } from "@/utils/geo-shelf";

import { GeoShelfSkeleton } from "./skeleton";

const PAGE_TITLE = "Shelf Space";
const PAGE_DESCRIPTION =
  "Third-party pages AI engines cite for your prompts, and whether you're on them";

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  const [projectParam] = useGeoProjectQueryState();

  return (
    <GeoProjectProvider projectId={projectParam ?? undefined}>
      <GeoShelfPageContent organizationSlug={organizationSlug} />
    </GeoProjectProvider>
  );
}

function GeoShelfPageContent({ organizationSlug }: GeoPageClientProps) {
  const page = useGeoShelfPage(organizationSlug);

  if (page.status === "loading") {
    return <GeoShelfSkeleton />;
  }

  if (page.status === "setup") {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{PAGE_TITLE}</h1>
            <p className="text-muted-foreground">{PAGE_DESCRIPTION}</p>
          </header>
          <EmptyState
            action={
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={withGeoProject(
                      `/${page.organizationSlug}/geo`,
                      page.projectId
                    )}
                  />
                }
              >
                Set up GEO tracking
              </Button>
            }
            description="Set up GEO tracking first, then see which pages engines cite and who is listed on them."
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.shelf}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title="Not set up yet"
          />
        </div>
      </PageContainer>
    );
  }

  return <GeoShelfReadyContent page={page} />;
}

function GeoShelfReadyContent({
  page,
}: {
  page: Extract<
    ReturnType<typeof useGeoShelfPage>,
    { status: "ready" }
  >;
}) {
  useHotkey(GEO_SHELF_ADD_HOTKEY, () => page.setAddOpen(true), {
    enabled: !page.addOpen && page.selectedRow === null,
  });

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{PAGE_TITLE}</h1>
            <p className="text-muted-foreground">{PAGE_DESCRIPTION}</p>
          </div>
          <Button className="gap-1.5" onClick={() => page.setAddOpen(true)}>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            {GEO_SHELF_ADD_LABEL}
            <Kbd className="ml-1 hidden sm:inline-flex">
              {GEO_SHELF_ADD_HOTKEY}
            </Kbd>
          </Button>
        </header>

        <div className="space-y-3">
          {page.rows.length > 0 ? (
            <ShelfPageControls
              filters={page.filters}
              hasRows
              onSearchChange={page.setSearch}
              onShelfFilterChange={page.setShelfFilter}
              onTicketFilterChange={page.setTicketFilter}
              onViewChange={page.setView}
              view={page.view}
            />
          ) : null}
          <ShelfView
            currentMemberId={page.currentMemberId}
            hasScanData={page.shelf.sources.some(
              (source) => source.origin === "scan"
            )}
            onAddShelf={() => page.setAddOpen(true)}
            onRowClick={page.openRow}
            onSetPlacementStatus={page.shelf.setPlacementStatus}
            onUpdateOpportunity={page.shelf.updateOpportunity}
            pendingSourceIds={page.shelf.pendingSourceIds}
            rows={page.filteredRows}
            ticketFilter={page.ticketFilter}
            totalCount={page.rows.length}
            view={page.view}
          />
        </div>
      </div>

      <ShelfDetailDialog
        currentMemberId={page.currentMemberId}
        isPending={
          page.selectedRow
            ? page.shelf.pendingSourceIds.has(page.selectedRow.id)
            : false
        }
        members={page.members}
        onOpenChange={(open) => {
          if (!open) {
            page.setSelected(null);
          }
        }}
        onSetPlacementStatus={page.shelf.setPlacementStatus}
        onUpdateOpportunity={page.shelf.updateOpportunity}
        open={page.selectedRow !== null}
        ownBrandName={page.ownBrandName}
        row={page.selectedRow}
      />

      <ShelfAddDialog
        competitors={page.competitors}
        currentMemberId={page.currentMemberId}
        existingUrls={page.rows.map((row) => row.url)}
        members={page.members}
        onOpenChange={page.setAddOpen}
        organizationId={page.organizationId}
        onSubmit={(draft) => {
          page.shelf.addSource(
            buildOptimisticShelfSource(draft, {
              ownBrandName: page.ownBrandName,
              ownDomain: page.ownDomain,
              competitors: page.competitors,
              createdByUserId: page.currentMember?.userId ?? null,
            })
          );
        }}
        open={page.addOpen}
        ownBrandName={page.ownBrandName}
      />
    </PageContainer>
  );
}
