import { useTranslations } from "use-intl";

import type { GeoPromptSourceFilter } from "@/types/geo";

export function useGeoPromptSourceLabels(): Record<
  GeoPromptSourceFilter,
  string
> {
  const t = useTranslations("geo.promptsTable.source");
  const tLabels = useTranslations("common.labels");
  return {
    all: tLabels("allSources"),
    auto: t("auto"),
    custom: tLabels("customOwn"),
  };
}
