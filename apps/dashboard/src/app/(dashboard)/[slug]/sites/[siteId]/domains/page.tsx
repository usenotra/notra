import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SiteDomainsPage } from "@/components/sites/pages/site-domains-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sites.detail.tabs");
  return { title: t("domains") };
}

export default function Page() {
  return <SiteDomainsPage />;
}
