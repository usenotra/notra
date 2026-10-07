import { useTranslations } from "use-intl";

import { LOG_SOURCE_COMMON_LABEL_KEYS } from "@/constants/logs";
import type { LogSourceFilter } from "@/types/webhooks/webhooks";
import { hasOwnKey } from "@/utils/has-own-key";

export function useLogSourceLabel() {
  const t = useTranslations("logs.sources");
  const tLabels = useTranslations("common.labels");
  return (source: LogSourceFilter) =>
    hasOwnKey(LOG_SOURCE_COMMON_LABEL_KEYS, source)
      ? tLabels(LOG_SOURCE_COMMON_LABEL_KEYS[source])
      : t(source);
}
