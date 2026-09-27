import { useLocale, useTranslations } from "next-intl";

import { formatMetric } from "@/utils/analytics-charts";

export function useFormatMetric() {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const notAvailable = tCommon("labels.nA");
  return (value: number | null) => formatMetric(value, locale, notAvailable);
}
