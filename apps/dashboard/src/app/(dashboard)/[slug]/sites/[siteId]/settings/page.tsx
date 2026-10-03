import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SiteSettingsPage } from "@/components/sites/pages/site-settings-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sites.detail.tabs");
  return { title: t("settings") };
}

export default function Page() {
  return <SiteSettingsPage />;
}
