import type { Metadata } from "next";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";

import PageClient from "./page-client";
import { GeoPersonasSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "GEO Personas",
};

export const instant = true;

async function PageContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await validateOrganizationAccess(slug);
  return <PageClient organizationSlug={slug} />;
}

function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<GeoPersonasSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
