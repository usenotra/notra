import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

import { getAuthIdentity } from "@/lib/auth/server";
import { readLocaleCookie } from "@/lib/i18n/locale-cookie";
import type { LocalePreference } from "@/types/i18n";
import { isDashboardLocale, negotiateDashboardLocale } from "@/utils/i18n";

async function readLocalePreference(): Promise<LocalePreference> {
  const cookiePreference = await readLocaleCookie();
  if (cookiePreference !== undefined) {
    return cookiePreference;
  }
  const identity = await getAuthIdentity();
  const stored = identity?.user.locale;
  return isDashboardLocale(stored) ? stored : null;
}

async function resolveRequestLocale() {
  const preference = await readLocalePreference();
  if (preference) {
    return preference;
  }
  return negotiateDashboardLocale((await headers()).get("accept-language"));
}

export default getRequestConfig(async () => {
  const locale = await resolveRequestLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
