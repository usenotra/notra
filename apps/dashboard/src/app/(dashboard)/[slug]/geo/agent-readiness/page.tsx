import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { GeoPageGate } from "@/components/geo/geo-page-gate";
import { validateOrganizationAccess } from "@/lib/auth/actions";
import type { AgentReadinessPageProps } from "@/types/agent-readiness";

import PageClient from "./page-client";
import { AgentReadinessSkeleton } from "./skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const tCommon = await getTranslations("common");
  return { title: tCommon("labels.agentReadiness") };
}

export const instant = true;

async function PageContent({ params }: AgentReadinessPageProps) {
  const { slug } = await params;
  await validateOrganizationAccess(slug);
  return <PageClient organizationSlug={slug} />;
}

function Page({ params }: AgentReadinessPageProps) {
  return (
    <Suspense fallback={<AgentReadinessSkeleton />}>
      <GeoPageGate fallback={<AgentReadinessSkeleton />}>
        <PageContent params={params} />
      </GeoPageGate>
    </Suspense>
  );
}
export default Page;
