import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import PageClient from "./page-client";
import { GeoShelfSkeleton } from "./skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("geo.pages.shelfSpace");
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
    <Suspense fallback={<GeoShelfSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
export default Page;
