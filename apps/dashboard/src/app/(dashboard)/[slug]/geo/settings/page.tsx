import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { geoSettingsPath } from "@/utils/settings-path";

export async function generateMetadata(): Promise<Metadata> {
  const tCommon = await getTranslations("common");
  return { title: tCommon("labels.geoSettings") };
}

export const instant = true;

export default async function GeoSettingsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const project = typeof query.project === "string" ? query.project : undefined;
  redirect(geoSettingsPath(slug, { project }));
}
