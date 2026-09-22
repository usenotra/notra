import type { Metadata } from "next";
import { Suspense } from "react";

import type { GeoPersonasPageProps } from "@/types/geo-personas-ui";

import { GeoScopeListPrefetch } from "../geo-project-scope";
import PageClient from "./page-client";
import { GeoPersonasSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO Personas",
};

export const instant = true;

async function PageContent({ params }: GeoPersonasPageProps) {
  const { slug } = await params;
  return (
    <GeoScopeListPrefetch procedure="personasList" slug={slug}>
      <PageClient organizationSlug={slug} />
    </GeoScopeListPrefetch>
  );
}

function Page({ params }: GeoPersonasPageProps) {
  return (
    <Suspense fallback={<GeoPersonasSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
