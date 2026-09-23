import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { loadGeoPageScope } from "@/lib/geo/page-scope.server";
import type { GeoServerPageProps } from "@/types/geo-hydration";
import { dehydrateContentListQueries } from "@/utils/dashboard-list-prefetch.server";

import Loading from "./loading";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Content",
};

export const instant = true;

function listPage(
  search: Record<string, string | string[] | undefined>
): number {
  const raw = Array.isArray(search.page) ? search.page[0] : search.page;
  const page = Number(raw);
  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }
  return page;
}

async function PageContent({ params, searchParams }: GeoServerPageProps) {
  const { slug } = await params;
  const scope = await loadGeoPageScope(slug, searchParams, "/content");

  return (
    <HydrationBoundary
      state={await dehydrateContentListQueries(
        scope.organizationId,
        scope.projectId,
        listPage(scope.search),
        scope.requestHeaders,
        scope.membership
      )}
    >
      <PageClient
        initialProjectId={scope.projectId ?? null}
        organizationSlug={slug}
      />
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
