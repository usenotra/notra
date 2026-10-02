import type { GeoSparklineMode } from "@notra/geo-core/types/geo";
import { useTranslations } from "use-intl";

export function useGeoSparklineModeLabels(): Record<GeoSparklineMode, string> {
  const t = useTranslations("geo.engineFamilySheet.modes");
  const tLabels = useTranslations("common.labels");
  const tGeoShared = useTranslations("geo.shared");
  return {
    all: tLabels("all"),
    search: tGeoShared("search"),
    memory: t("memory"),
  };
}
