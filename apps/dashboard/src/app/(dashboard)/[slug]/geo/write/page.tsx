import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { GeoPageGate } from "@/components/geo/geo-page-gate";

import PageClient from "./page-client";
import { GeoWriterSkeleton } from "./skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("geo.pages.write");
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
    <Suspense fallback={<GeoWriterSkeleton />}>
      <GeoPageGate fallback={<GeoWriterSkeleton />}>
        <PageContent params={params} />
      </GeoPageGate>
    </Suspense>
  );
}
export default Page;
