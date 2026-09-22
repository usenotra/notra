import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import { geoRequestedProjectId } from "@/utils/geo-hydration";
import { dehydrateGeoPromptResults } from "@/utils/geo-prefetch.server";

import PageClient from "./page-client";
import { GeoPromptsSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO Prompts",
};

export const instant = true;

async function PageContent({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const [{ organization, user, member }, requestHeaders, search] =
    await Promise.all([
      validateOrganizationAccess(slug),
      headers(),
      searchParams,
    ]);
  const projectId = await resolveInitialGeoProjectId(
    organization.id,
    slug,
    geoRequestedProjectId(search)
  );

  return (
    <HydrationBoundary
      state={await dehydrateGeoPromptResults(
        organization.id,
        projectId,
        search,
        requestHeaders,
        member && { userId: user.id, id: member.id, role: member.role }
      )}
    >
      <PageClient organizationSlug={slug} />
    </HydrationBoundary>
  );
}

function Page({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<GeoPromptsSkeleton />}>
      <PageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
export default Page;
