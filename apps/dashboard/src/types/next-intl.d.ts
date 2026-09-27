import type { DashboardLocale } from "@/types/i18n";

import type messages from "../../messages/en.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: DashboardLocale;
    Messages: typeof messages;
  }
}
