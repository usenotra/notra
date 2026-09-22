import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import { dehydrateContentListQueries } from "@/utils/content-prefetch.server";
import { geoRequestedProjectId } from "@/utils/geo-hydration";

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
      state={await dehydrateContentListQueries(
        organization.id,
        projectId,
        pageFromSearch(search.page),
        requestHeaders,
        member && { userId: user.id, id: member.id, role: member.role }
      )}
    >
      <PageClient initialProjectId={projectId} organizationSlug={slug} />
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
    <Suspense fallback={<Loading />}>
      <PageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
export default Page;
