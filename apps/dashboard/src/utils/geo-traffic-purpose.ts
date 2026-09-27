import { AI_TRAFFIC_PURPOSE_KEYS } from "@/constants/geo-traffic-purpose";

export function aiTrafficPurposeKey(
  category: string
): (typeof AI_TRAFFIC_PURPOSE_KEYS)[number] | null {
  return AI_TRAFFIC_PURPOSE_KEYS.find((key) => key === category) ?? null;
}
