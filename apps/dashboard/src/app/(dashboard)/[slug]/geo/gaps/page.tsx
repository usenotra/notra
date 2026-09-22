import type { Metadata } from "next";
import { Suspense } from "react";

import type { GeoServerPageProps } from "@/types/geo-hydration";

import { GeoScopeListPrefetch } from "../geo-project-scope";
import PageClient from "./page-client";
import { GeoGapsSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO Content Gaps",
};

export const instant = true;

async function PageContent({ params, searchParams }: GeoServerPageProps) {
  const { slug } = await params;
  return (
    <GeoScopeListPrefetch
      basePath="/geo/gaps"
      procedure="writerGaps"
      searchParams={searchParams}
      slug={slug}
    >
      <PageClient organizationSlug={slug} />
    </GeoScopeListPrefetch>
  );
}

function Page({ params, searchParams }: GeoServerPageProps) {
  return (
    <Suspense fallback={<GeoGapsSkeleton />}>
      <PageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
export default Page;
