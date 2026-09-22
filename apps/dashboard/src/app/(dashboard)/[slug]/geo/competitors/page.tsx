import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { loadGeoPageScope } from "@/lib/geo/page-scope.server";
import type { GeoServerPageProps } from "@/types/geo-hydration";
import { dehydrateGeoCompetitorShare } from "@/utils/geo-prefetch.server";

import PageClient from "./page-client";
import { GeoCompetitorsSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO Competitors",
};

export const instant = true;

async function PageContent({ params, searchParams }: GeoServerPageProps) {
  const { slug } = await params;
  const scope = await loadGeoPageScope(slug, searchParams, "/geo/competitors");

  return (
    <HydrationBoundary
      state={await dehydrateGeoCompetitorShare(
        scope.organizationId,
        scope.projectId,
        scope.search,
        scope.requestHeaders,
        scope.membership
      )}
    >
      <PageClient organizationSlug={slug} />
    </HydrationBoundary>
  );
}

function Page({ params, searchParams }: GeoServerPageProps) {
  return (
    <Suspense fallback={<GeoCompetitorsSkeleton />}>
      <PageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
export default Page;
