import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DashboardHomePageShell } from "../home-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return {
    title: t("metaTitle"),
  };
}

export const instant = true;

export default DashboardHomePageShell;
