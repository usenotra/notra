import { useLocale, useTranslations } from "next-intl";

import { formatRelative } from "@/utils/format-relative";

export function useFormatRelative() {
  const locale = useLocale();
  const t = useTranslations("common.time");
  const justNow = t("justNow");
  return (iso: string, now?: number) =>
    formatRelative(iso, locale, justNow, now);
}
