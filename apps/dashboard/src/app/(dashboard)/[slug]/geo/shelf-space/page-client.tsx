"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import Link from "@/components/framework/link";
import { ShelfAddDialog } from "@/components/geo/shelf/shelf-add-dialog";
import { ShelfDetailDialog } from "@/components/geo/shelf/shelf-detail-dialog";
import { ShelfPageControls } from "@/components/geo/shelf/shelf-page-controls";
import { ShelfView } from "@/components/geo/shelf/shelf-view";
import { PageContainer } from "@/components/layout/container";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { GEO_SHELF_ADD_HOTKEY } from "@/constants/geo-shelf";
import { useGeoShelfPage } from "@/lib/hooks/use-geo-shelf-page";
import type { GeoPageClientProps } from "@/types/geo";
import type {
  GeoShelfLoadedProps,
  GeoShelfNotSetupProps,
} from "@/types/geo-shelf";
import { withGeoProject } from "@/utils/geo-paths";
import { buildOptimisticShelfSource } from "@/utils/geo-shelf";

import { GeoShelfSkeleton } from "./skeleton";

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
  const t = useTranslations("geo.pages.shelfSpace");
  const tCommon = useTranslations("common");
  const tShared = useTranslations("geo.pages.shared");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {tCommon("labels.shelfSpace")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
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
              {tGeoShared("setUpGeoTracking")}
            </Button>
          }
          description={t("setupDescription")}
          preview={
            <EmptyStateTablePreview
              columns={EMPTY_STATE_TABLE_COLUMNS.shelf}
              rows={EMPTY_STATE_TABLE_ROWS}
            />
          }
          title={tShared("notSetUpTitle")}
        />
      </div>
    </PageContainer>
  );
}

function GeoShelfLoaded({ page }: GeoShelfLoadedProps) {
  const t = useTranslations("geo.pages.shelfSpace");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {tCommon("labels.shelfSpace")}
            </h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <Button
            className="gap-1.5"
            onClick={() => page.onAddOpenChange(true)}
          >
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            {tGeoShared("addShelf")}
            <Kbd className="ml-1 hidden sm:inline-flex">
              {GEO_SHELF_ADD_HOTKEY}
            </Kbd>
          </Button>
        </header>

        <div className="space-y-3">
          {page.totalCount > 0 ? (
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
            boardCounts={page.boardCounts}
            currentMemberId={page.currentMemberId}
            filteredCount={page.filteredCount}
            hasNextPage={page.hasNextPage}
            hasScanData={page.hasScanData}
            isFetching={page.isFetching}
            isFetchingNextPage={page.isFetchingNextPage}
            onAddShelf={() => page.onAddOpenChange(true)}
            onLoadMore={page.onLoadMore}
            onRowClick={page.onRowClick}
            onSetPlacementStatus={page.setPlacementStatus}
            onSortChange={page.onSortChange}
            onUpdateOpportunity={page.updateOpportunity}
            pendingSourceIds={page.pendingSourceIds}
            rows={page.rows}
            sort={page.sort}
            ticketFilter={page.filters.ticket}
            totalCount={page.totalCount}
            view={page.view}
          />
        </div>
      </div>

      <ShelfDetailDialog
        organizationId={page.organizationId}
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
