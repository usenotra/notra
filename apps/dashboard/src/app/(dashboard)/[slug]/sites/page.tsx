import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import PageClient from "./page-client";
import { SitesPageSkeleton } from "./skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sites");
  return { title: t("title") };
}

async function PageContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PageClient organizationSlug={slug} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<SitesPageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
