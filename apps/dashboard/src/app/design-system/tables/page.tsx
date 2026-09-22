"use client";

import { Switch } from "@notra/ui/components/ui/switch";
import { useMemo, useState } from "react";

import { CollectionsView } from "@/components/content/collections-view";
import { DesignSystemNav } from "@/components/design-system/design-system-nav";
import { AiTrafficCard } from "@/components/geo/ai-traffic-card";
import { EngineRateTable } from "@/components/geo/engine-rate-table";
import { TrafficPagesCard } from "@/components/geo/traffic-pages-card";
import { PageContainer } from "@/components/layout/container";
import { COLLECTIONS_PAGE_SIZE } from "@/constants/content-collections";
import { DESIGN_SYSTEM_COLLECTIONS } from "@/constants/design-system-collections";
import {
  DESIGN_SYSTEM_GEO_OVERVIEW,
  DESIGN_SYSTEM_GEO_POINTS,
  DESIGN_SYSTEM_GEO_TRACKED_ENGINES,
} from "@/constants/design-system-geo";
import {
  DESIGN_SYSTEM_TRAFFIC_PAGES,
  DESIGN_SYSTEM_TRAFFIC_RESPONSE,
} from "@/constants/design-system-traffic";
import type { TablePaginationState } from "@/types/table";

const CONTENT_DEMO_SLUG = "acme";

export default function DesignSystemTablesPage() {
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(
    1,
    Math.ceil(DESIGN_SYSTEM_COLLECTIONS.length / COLLECTIONS_PAGE_SIZE)
  );
  const collections = useMemo(() => {
    const start = (page - 1) * COLLECTIONS_PAGE_SIZE;
    return DESIGN_SYSTEM_COLLECTIONS.slice(
      start,
      start + COLLECTIONS_PAGE_SIZE
    );
  }, [page]);
  const pagination: TablePaginationState = {
    page,
    pageCount,
    pageSize: COLLECTIONS_PAGE_SIZE,
    totalItems: DESIGN_SYSTEM_COLLECTIONS.length,
    pageRowCount: collections.length,
    setPage: (next) => setPage(Math.min(Math.max(1, next), pageCount)),
  };

  return (
    <main className="bg-background min-h-screen">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
        <DesignSystemNav />
        <label
          className="text-muted-foreground flex items-center gap-2 text-sm"
          htmlFor="dashboard-table-loading"
        >
          Loading overlay
          <Switch
            checked={loading}
            id="dashboard-table-loading"
            onCheckedChange={setLoading}
          />
        </label>
      </div>

      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              AI Traffic
            </h1>
            <p className="text-muted-foreground text-sm">
              AI crawlers and referrals visiting your site
            </p>
          </header>
          <div className="flex flex-col gap-6">
            <AiTrafficCard
              pages={DESIGN_SYSTEM_TRAFFIC_PAGES}
              settingsHref="/design-system/tables"
              traffic={DESIGN_SYSTEM_TRAFFIC_RESPONSE}
            />
            <TrafficPagesCard
              isPending={loading}
              pages={DESIGN_SYSTEM_TRAFFIC_PAGES}
            />
          </div>
        </div>
      </PageContainer>

      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">GEO</h1>
            <p className="text-muted-foreground">
              How AI engines talk about Neon
            </p>
          </header>
          <EngineRateTable
            companyName="Neon"
            engines={DESIGN_SYSTEM_GEO_OVERVIEW}
            isScanning={loading}
            timeseriesPoints={DESIGN_SYSTEM_GEO_POINTS}
            trackedEngines={DESIGN_SYSTEM_GEO_TRACKED_ENGINES}
          />
        </div>
      </PageContainer>

      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
            <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
              Posts and collections in one place.
            </p>
          </header>
          <div className="space-y-3">
            <h2 className="text-sm font-medium">All content</h2>
            <CollectionsView
              collections={collections}
              loading={loading}
              organizationSlug={CONTENT_DEMO_SLUG}
              pagination={pagination}
              view="list"
            />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
