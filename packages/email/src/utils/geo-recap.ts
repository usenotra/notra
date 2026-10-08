import type { GeoRecapTone } from "../types/geo-recap";

export function toneFromDelta(label: string): GeoRecapTone {
  if (label.startsWith("+")) {
    return "up";
  }
  if (label.startsWith("-") || label.startsWith("−")) {
    return "down";
  }
  return "neutral";
}
