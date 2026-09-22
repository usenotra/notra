import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { loadGeoPageScope } from "@/lib/geo/page-scope.server";
import type { GeoServerPageProps } from "@/types/geo-hydration";
import { dehydrateContentListQueries } from "@/utils/content-prefetch.server";

import Loading from "./loading";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Content",
};

export const instant = true;

function pageFromSearch(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

async function PageContent({ params, searchParams }: GeoServerPageProps) {
  const { slug } = await params;
  const scope = await loadGeoPageScope(slug, searchParams, "/content");

  return (
    <HydrationBoundary
      state={await dehydrateContentListQueries(
        scope.organizationId,
        scope.projectId,
        pageFromSearch(scope.search.page),
        scope.requestHeaders,
        scope.membership
      )}
    >
      <PageClient initialProjectId={scope.projectId} organizationSlug={slug} />
    </HydrationBoundary>
  );
}

function Page({ params, searchParams }: GeoServerPageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
export default Page;
