import type { Locale } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useLocale } from "use-intl";

import type { DashboardLocale } from "@/types/i18n";

const DATE_FNS_LOCALES: Record<DashboardLocale, Locale> = { en: enUS, de };

export function useDateFnsLocale(): Locale {
  return DATE_FNS_LOCALES[useLocale()];
}
