import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import { dehydrateContentListQueries } from "@/utils/dashboard-list-prefetch.server";
import { geoRequestedProjectId } from "@/utils/geo-hydration";

import Loading from "./loading";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Content",
};

export const instant = true;

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

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

async function PageContent({ params, searchParams }: PageProps) {
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
        listPage(search),
        requestHeaders,
        member && { userId: user.id, id: member.id, role: member.role }
      )}
    >
      <PageClient
        initialProjectId={projectId ?? null}
        organizationSlug={slug}
      />
    </HydrationBoundary>
  );
}

function Page(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent {...props} />
    </Suspense>
  );
}
export default Page;
