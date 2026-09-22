import type { Metadata } from "next";
import { Suspense } from "react";

import { GeoScopeListPrefetch } from "../geo-project-scope";
import PageClient from "./page-client";
import { GeoGapsSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO Content Gaps",
};

export const instant = true;

async function PageContent({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  return (
    <GeoScopeListPrefetch procedure="writerGaps" slug={slug}>
      <PageClient organizationSlug={slug} />
    </GeoScopeListPrefetch>
  );
}

function Page({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  return (
    <Suspense fallback={<GeoGapsSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
