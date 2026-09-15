import { redirect } from "next/navigation";

import type { SettingsSecurityRedirectProps } from "@/types/settings/security";
import { settingsPath } from "@/utils/settings-path";

export const instant = true;

export default async function SettingsSecurityRedirect({
  params,
}: SettingsSecurityRedirectProps) {
  const { slug } = await params;
  redirect(settingsPath(slug, "security"));
}
