import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import type { GeoServerPageProps } from "@/types/geo-hydration";
import { geoRequestedProjectId } from "@/utils/geo-hydration";
import { dehydrateGeoOverviewQueries } from "@/utils/geo-prefetch.server";

import PageClient from "./page-client";
import { GeoPageSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO",
};

export const instant = true;

async function PageContent({ params, searchParams }: GeoServerPageProps) {
  const { slug } = await params;
  const [{ organization }, search, requestHeaders] = await Promise.all([
    validateOrganizationAccess(slug),
    searchParams,
    headers(),
  ]);

  const projectId = await resolveInitialGeoProjectId(
    organization.id,
    slug,
    geoRequestedProjectId(search)
  );

  return (
    <HydrationBoundary
      state={await dehydrateGeoOverviewQueries(
        organization.id,
        projectId,
        search,
        requestHeaders
      )}
    >
      <PageClient organizationSlug={slug} />
    </HydrationBoundary>
  );
}

function Page({ params, searchParams }: GeoServerPageProps) {
  return (
    <Suspense fallback={<GeoPageSkeleton />}>
      <PageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
export default Page;
