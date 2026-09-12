import { redirect } from "next/navigation";

import { settingsPath } from "@/utils/settings-path";

export const instant = true;

export default async function SettingsCreditsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const success = query.success === "true" ? "true" : undefined;
  redirect(settingsPath(slug, "credits", { success }));
}
