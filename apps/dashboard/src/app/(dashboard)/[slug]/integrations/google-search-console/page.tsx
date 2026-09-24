import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { GeoProjectQueryProvider } from "@/components/providers/geo-project-provider";
import { validateOrganizationAccess } from "@/lib/auth/actions";
import { resolveInitialGeoProjectId } from "@/lib/geo/initial-project.server";
import type { GeoServerPageProps } from "@/types/geo-hydration";
import {
  geoProjectRepairPath,
  geoRequestedProjectId,
} from "@/utils/geo-hydration";

import Loading from "./loading";
import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Google Search Console",
};

async function PageContent({ params, searchParams }: GeoServerPageProps) {
  const { slug } = await params;
  const [{ organization }, search] = await Promise.all([
    validateOrganizationAccess(slug),
    searchParams,
  ]);
  const requestedProjectId = geoRequestedProjectId(search);
  const projectId = await resolveInitialGeoProjectId(
    organization.id,
    slug,
    requestedProjectId
  );
  if (requestedProjectId && requestedProjectId !== projectId) {
    redirect(
      geoProjectRepairPath(
        slug,
        search,
        projectId,
        "/integrations/google-search-console"
      )
    );
  }

  return (
    <GeoProjectQueryProvider initialProjectId={projectId}>
      <PageClient organizationSlug={slug} />
    </GeoProjectQueryProvider>
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
