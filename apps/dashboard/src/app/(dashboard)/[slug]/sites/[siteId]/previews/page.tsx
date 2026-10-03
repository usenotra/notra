import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SitePreviewsPage } from "@/components/sites/pages/site-previews-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sites.detail.tabs");
  return { title: t("previews") };
}

export default function Page() {
  return <SitePreviewsPage />;
}
