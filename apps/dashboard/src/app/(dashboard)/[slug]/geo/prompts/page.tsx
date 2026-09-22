import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { loadGeoPageScope } from "@/lib/geo/page-scope.server";
import type { GeoServerPageProps } from "@/types/geo-hydration";
import { dehydrateGeoPromptResults } from "@/utils/geo-prefetch.server";

import PageClient from "./page-client";
import { GeoPromptsSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO Prompts",
};

export const instant = true;

async function PageContent({ params, searchParams }: GeoServerPageProps) {
  const { slug } = await params;
  const scope = await loadGeoPageScope(slug, searchParams, "/geo/prompts");

  return (
    <HydrationBoundary
      state={await dehydrateGeoPromptResults(
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
    <Suspense fallback={<GeoPromptsSkeleton />}>
      <PageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
export default Page;
