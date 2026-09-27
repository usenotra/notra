import { getRequestConfig } from "next-intl/server";

import { getAuthIdentity } from "@/lib/auth/server";
import { readLocaleCookie } from "@/lib/i18n/locale-cookie";
import { resolveDashboardLocale } from "@/utils/i18n";

async function resolveRequestLocale() {
  const cookieLocale = await readLocaleCookie();
  if (cookieLocale) {
    return cookieLocale;
  }
  const identity = await getAuthIdentity();
  return resolveDashboardLocale(identity?.user.locale);
}

export default getRequestConfig(async () => {
  const locale = await resolveRequestLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
