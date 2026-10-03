import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SiteEditorPage } from "@/components/sites/pages/site-editor-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sites.detail.tabs");
  return { title: t("editor") };
}

export default function Page() {
  return <SiteEditorPage />;
}
