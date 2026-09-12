import { GEO_DEFAULT_TAB, GEO_TAB_VALUES } from "@notra/geo-core/constants/geo";
import type { GeoTab } from "@notra/geo-core/types/geo";

export function toGeoTab(value: string | null): GeoTab {
  if (value === "sentiment") {
    return "brand-sentiment";
  }
  return GEO_TAB_VALUES.find((tab) => tab === value) ?? GEO_DEFAULT_TAB;
}
