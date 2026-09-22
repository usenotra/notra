import type { Metadata } from "next";
import { Suspense } from "react";

import { GeoScopeListPrefetch } from "../geo-project-scope";
import PageClient from "./page-client";
import { GeoWriterSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO Writer",
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
    <GeoScopeListPrefetch procedure="writerBriefsList" slug={slug}>
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
    <Suspense fallback={<GeoWriterSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
