import { redirect } from "next/navigation";

import type { SettingsUrlSearchParams } from "@/types/settings/modal";
import { firstSearchParamValue, settingsPath } from "@/utils/settings-path";

export const instant = true;

export default async function SettingsBillingRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SettingsUrlSearchParams>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (firstSearchParamValue(query.tab) === "usage") {
    redirect(settingsPath(slug, "usage"));
  }
  redirect(settingsPath(slug, "billing"));
}
