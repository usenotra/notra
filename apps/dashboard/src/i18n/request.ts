import { getRequestConfig } from "next-intl/server";

import { getAuthIdentity } from "@/lib/auth/server";
import { resolveDashboardLocale } from "@/utils/i18n";

export default getRequestConfig(async () => {
  const identity = await getAuthIdentity();
  const locale = resolveDashboardLocale(identity?.user.locale);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
