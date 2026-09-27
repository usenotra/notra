import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import Loading from "../loading";
import PageClient from "./page-client";

export async function generateMetadata(): Promise<Metadata> {
  const tIntegrationsShared = await getTranslations("integrations.shared");
  return { title: tIntegrationsShared("granolaIntegrations") };
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
