import { redirect } from "next/navigation";

import { LOGS_SETTINGS_SEARCH_KEYS } from "@/constants/settings";
import type { SettingsUrlSearchParams } from "@/types/settings/modal";
import {
  settingsPath,
  settingsQueryFromSearchParams,
} from "@/utils/settings-path";

export const instant = true;

export default async function SettingsLogsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SettingsUrlSearchParams>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  redirect(
    settingsPath(
      slug,
      "logs",
      settingsQueryFromSearchParams(query, LOGS_SETTINGS_SEARCH_KEYS)
    )
  );
}
