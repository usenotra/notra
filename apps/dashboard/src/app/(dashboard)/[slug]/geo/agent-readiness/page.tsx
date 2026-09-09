import type { Metadata } from "next";
import { Suspense } from "react";

import type { AgentReadinessPageProps } from "@/types/agent-readiness";

import PageClient from "./page-client";
import { AgentReadinessSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Agent Readiness",
};

export const instant = true;

// Access is enforced by the `[slug]` layout; this page only needs the slug.
async function PageContent({ params }: AgentReadinessPageProps) {
  const { slug } = await params;
  return <PageClient organizationSlug={slug} />;
}

function Page({ params }: AgentReadinessPageProps) {
  return (
    <Suspense fallback={<AgentReadinessSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
