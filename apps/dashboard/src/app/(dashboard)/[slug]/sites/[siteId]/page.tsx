import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SiteOverviewPage } from "@/components/sites/pages/site-overview-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sites.detail.tabs");
  return { title: t("overview") };
}

export default function Page() {
  return <SiteOverviewPage />;
}
