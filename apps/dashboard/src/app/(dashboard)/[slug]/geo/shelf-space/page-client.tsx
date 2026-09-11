"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import Link from "next/link";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { ShelfAddDialog } from "@/components/geo/shelf/shelf-add-dialog";
import { ShelfDetailDialog } from "@/components/geo/shelf/shelf-detail-dialog";
import { ShelfPageControls } from "@/components/geo/shelf/shelf-page-controls";
import { ShelfView } from "@/components/geo/shelf/shelf-view";
import { PageContainer } from "@/components/layout/container";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  GEO_SHELF_ADD_HOTKEY,
  GEO_SHELF_ADD_LABEL,
} from "@/constants/geo-shelf";
import { useGeoShelfPage } from "@/lib/hooks/use-geo-shelf-page";
import type { GeoPageClientProps } from "@/types/geo";
import type {
  GeoShelfLoadedProps,
  GeoShelfNotSetupProps,
} from "@/types/geo-shelf";
import { withGeoProject } from "@/utils/geo-paths";
import { buildOptimisticShelfSource } from "@/utils/geo-shelf";

import { GeoShelfSkeleton } from "./skeleton";

const PAGE_TITLE = "Shelf Space";
const PAGE_DESCRIPTION =
  "Third-party pages AI engines cite for your prompts, and whether you're on them";

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  return <GeoShelfPageContent organizationSlug={organizationSlug} />;
}

function GeoShelfPageContent({ organizationSlug }: GeoPageClientProps) {
  const page = useGeoShelfPage(organizationSlug);

  if (page.status === "loading") {
    return <GeoShelfSkeleton />;
  }

  if (page.status === "empty") {
    return (
      <GeoShelfNotSetup
        organizationSlug={page.organizationSlug}
        projectId={page.projectId}
      />
    );
  }

  return <GeoShelfLoaded page={page} />;
}

function GeoShelfNotSetup({
  organizationSlug,
  projectId,
}: GeoShelfNotSetupProps) {
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
                  href={withGeoProject(`/${organizationSlug}/geo`, projectId)}
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

function GeoShelfLoaded({ page }: GeoShelfLoadedProps) {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{PAGE_TITLE}</h1>
            <p className="text-muted-foreground">{PAGE_DESCRIPTION}</p>
          </div>
          <Button
            className="gap-1.5"
            onClick={() => page.onAddOpenChange(true)}
          >
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
              onSearchChange={page.onSearchChange}
              onShelfFilterChange={page.onShelfFilterChange}
              onTicketFilterChange={page.onTicketFilterChange}
              onViewChange={page.onViewChange}
              view={page.view}
            />
          ) : null}
          <ShelfView
            currentMemberId={page.currentMemberId}
            hasScanData={page.hasScanData}
            onAddShelf={() => page.onAddOpenChange(true)}
            onRowClick={page.onRowClick}
            onSetPlacementStatus={page.setPlacementStatus}
            onUpdateOpportunity={page.updateOpportunity}
            pendingSourceIds={page.pendingSourceIds}
            rows={page.filteredRows}
            ticketFilter={page.filters.ticket}
            totalCount={page.rows.length}
            view={page.view}
          />
        </div>
      </div>

      <ShelfDetailDialog
        currentMemberId={page.currentMemberId}
        isPending={
          page.selectedRow
            ? page.pendingSourceIds.has(page.selectedRow.id)
            : false
        }
        members={page.members}
        onOpenChange={page.onSelectedOpenChange}
        onSetPlacementStatus={page.setPlacementStatus}
        onUpdateOpportunity={page.updateOpportunity}
        open={page.selectedRow !== null}
        ownBrandName={page.ownBrandName}
        row={page.selectedRow}
      />

      <ShelfAddDialog
        competitors={page.competitors}
        currentMemberId={page.currentMemberId}
        existingUrls={page.rows.map((row) => row.url)}
        members={page.members}
        onOpenChange={page.onAddOpenChange}
        organizationId={page.organizationId}
        onSubmit={(draft) => {
          page.addSource(
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
