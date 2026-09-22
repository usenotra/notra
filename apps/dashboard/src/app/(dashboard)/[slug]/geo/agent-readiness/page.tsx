import type { Metadata } from "next";
import { Suspense } from "react";

import type { AgentReadinessPageProps } from "@/types/agent-readiness";

import { GeoScopeListPrefetch } from "../geo-project-scope";
import PageClient from "./page-client";
import { AgentReadinessSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Agent Readiness",
};

export const instant = true;

async function PageContent({ params }: AgentReadinessPageProps) {
  const { slug } = await params;
  return (
    <GeoScopeListPrefetch procedure="agentReadiness" slug={slug}>
      <PageClient organizationSlug={slug} />
    </GeoScopeListPrefetch>
  );
}

function Page({ params }: AgentReadinessPageProps) {
  return (
    <Suspense fallback={<AgentReadinessSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
