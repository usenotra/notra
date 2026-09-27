import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import PageClient from "./page-client";
import { GeoGapsSkeleton } from "./skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("geo.pages.gaps");
  return { title: t("metaTitle") };
}

export const instant = true;

async function PageContent({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  return <PageClient organizationSlug={slug} />;
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
