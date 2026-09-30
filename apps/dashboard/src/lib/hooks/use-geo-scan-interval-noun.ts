import { GEO_SCAN_HOURS_PER_DAY } from "@notra/geo-core/constants/geo";
import { useTranslations } from "next-intl";

import { geoScanIntervalMessageKey } from "@/utils/geo-scan-interval-key";

export function useGeoScanIntervalNoun() {
  const t = useTranslations("geo.geoScanSchedule.nouns");
  return (intervalHours: number): string => {
    const key = geoScanIntervalMessageKey(intervalHours);
    if (key) {
      return t(`preset.${key}`);
    }
    if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
      return t("fallback");
    }
    if (intervalHours % GEO_SCAN_HOURS_PER_DAY === 0) {
      return t("days", { count: intervalHours / GEO_SCAN_HOURS_PER_DAY });
    }
    return t("hours", { count: intervalHours });
  };
}
