import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SiteDeploymentsPage } from "@/components/sites/pages/site-deployments-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sites.detail.tabs");
  return { title: t("deployments") };
}

export default function Page() {
  return <SiteDeploymentsPage />;
}
