import { AI_TRAFFIC_PURPOSES } from "@/constants/ai-traffic-purposes";

export function aiTrafficPurposeKey(
  category: string
): (typeof AI_TRAFFIC_PURPOSES)[number] | null {
  return AI_TRAFFIC_PURPOSES.find((purpose) => purpose === category) ?? null;
}
