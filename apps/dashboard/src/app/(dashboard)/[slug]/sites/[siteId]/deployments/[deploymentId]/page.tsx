import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SiteDeploymentDetailPage } from "@/components/sites/pages/site-deployment-detail-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sites.deploymentPage");
  return { title: t("title") };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; siteId: string; deploymentId: string }>;
}) {
  const { deploymentId } = await params;
  return <SiteDeploymentDetailPage deploymentId={deploymentId} />;
}
