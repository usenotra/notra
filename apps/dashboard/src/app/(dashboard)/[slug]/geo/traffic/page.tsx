import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import type { GeoServerPageProps } from "@/types/geo-hydration";
import {
  geoProjectRepairPath,
  geoRequestedProjectId,
} from "@/utils/geo-hydration";
import { dehydrateGeoTrafficQueries } from "@/utils/geo-prefetch.server";

import PageClient from "./page-client";
import { GeoTrafficSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO Traffic",
};

export const instant = true;

async function PageContent({ params, searchParams }: GeoServerPageProps) {
  const { slug } = await params;
  const [{ organization }, search, requestHeaders] = await Promise.all([
    validateOrganizationAccess(slug),
    searchParams,
    headers(),
  ]);

  const requestedProjectId = geoRequestedProjectId(search);
  const projectId = await resolveInitialGeoProjectId(
    organization.id,
    slug,
    requestedProjectId
  );

  // Same guard as the GEO overview: repair an invalid `?project=` before the
  // client scope can override the validated one and miss every hydrated key.
  if (requestedProjectId && requestedProjectId !== projectId) {
    redirect(geoProjectRepairPath(slug, search, projectId, "/geo/traffic"));
  }

  return (
    <HydrationBoundary
      state={await dehydrateGeoTrafficQueries(
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
    <Suspense fallback={<GeoTrafficSkeleton />}>
      <PageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
export default Page;
