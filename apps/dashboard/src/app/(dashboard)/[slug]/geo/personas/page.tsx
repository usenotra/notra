import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { validateOrganizationAccess } from "@/lib/auth/actions";
import type { GeoPersonasPageProps } from "@/types/geo-personas-ui";

import PageClient from "./page-client";
import { GeoPersonasSkeleton } from "./skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("geo.pages.personas");
  return { title: t("metaTitle") };
}

export const instant = true;

async function PageContent({ params }: GeoPersonasPageProps) {
  const { slug } = await params;
  await validateOrganizationAccess(slug);
  return <PageClient organizationSlug={slug} />;
}

function Page({ params }: GeoPersonasPageProps) {
  return (
    <Suspense fallback={<GeoPersonasSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
