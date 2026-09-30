import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import Loading from "./loading";
import PageClient from "./page-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("automation");
  return {
    title: t("eventsMetaTitle"),
  };
}

async function Page({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<Loading />}>
      <PageClient organizationSlug={slug} />
    </Suspense>
  );
}

export default Page;
