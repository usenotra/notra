import { redirect } from "next/navigation";

import { settingsPath } from "@/utils/settings-path";

export const instant = true;

export default async function SettingsNotificationsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(settingsPath(slug, "notifications"));
}
