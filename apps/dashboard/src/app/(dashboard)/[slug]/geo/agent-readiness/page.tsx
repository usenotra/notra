import type { Metadata } from "next";
import { Suspense } from "react";

import type { GeoServerPageProps } from "@/types/geo-hydration";

import { GeoScopeListPrefetch } from "../geo-project-scope";
import PageClient from "./page-client";
import { AgentReadinessSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Agent Readiness",
};

export const instant = true;

async function PageContent({ params, searchParams }: GeoServerPageProps) {
  const { slug } = await params;
  return (
    <GeoScopeListPrefetch
      basePath="/geo/agent-readiness"
      procedure="agentReadiness"
      searchParams={searchParams}
      slug={slug}
    >
      <PageClient organizationSlug={slug} />
    </GeoScopeListPrefetch>
  );
}

function Page({ params, searchParams }: GeoServerPageProps) {
  return (
    <Suspense fallback={<AgentReadinessSkeleton />}>
      <PageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
export default Page;
