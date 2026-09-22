import type { Metadata } from "next";
import { Suspense } from "react";

import type { GeoServerPageProps } from "@/types/geo-hydration";

import { GeoScopeListPrefetch } from "../geo-project-scope";
import PageClient from "./page-client";
import { GeoPersonasSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO Personas",
};

export const instant = true;

async function PageContent({ params, searchParams }: GeoServerPageProps) {
  const { slug } = await params;
  return (
    <GeoScopeListPrefetch
      basePath="/geo/personas"
      procedure="personasList"
      searchParams={searchParams}
      slug={slug}
    >
      <PageClient organizationSlug={slug} />
    </GeoScopeListPrefetch>
  );
}

function Page({ params, searchParams }: GeoServerPageProps) {
  return (
    <Suspense fallback={<GeoPersonasSkeleton />}>
      <PageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
export default Page;
