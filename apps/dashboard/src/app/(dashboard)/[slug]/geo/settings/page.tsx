import { redirect } from "next/navigation";

import { geoSettingsPath } from "@/utils/settings-path";

export const metadata = {
  title: "GEO Settings",
};

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
