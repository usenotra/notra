import { GEO_SCAN_INTERVAL_MESSAGE_KEYS } from "@/constants/geo-scan-interval-keys";

export function geoScanIntervalMessageKey(
  intervalHours: number
): (typeof GEO_SCAN_INTERVAL_MESSAGE_KEYS)[number] | null {
  return (
    GEO_SCAN_INTERVAL_MESSAGE_KEYS.find(
      (key) => Number(key) === intervalHours
    ) ?? null
  );
}
