import { useTranslations } from "use-intl";

import {
  AI_TRAFFIC_CONFIDENCES,
  AI_TRAFFIC_PURPOSE_LABEL_KEYS,
} from "@/constants/ai-traffic-purposes";
import { aiTrafficPurposeKey } from "@/utils/ai-traffic-purpose";

export function useAiTrafficLabels() {
  const tPurpose = useTranslations("geo.purposeBadge");
  const tGeoShared = useTranslations("geo.shared");
  const tConfidence = useTranslations("geo.shared.trafficConfidence");
  return {
    purpose: (category: string) => {
      const key = aiTrafficPurposeKey(category);
      return key ? tGeoShared(AI_TRAFFIC_PURPOSE_LABEL_KEYS[key]) : category;
    },
    purposeDescription: (category: string) => {
      const key = aiTrafficPurposeKey(category);
      return key ? tPurpose(`description.${key}`) : category;
    },
    confidence: (confidence: string) => {
      const key = AI_TRAFFIC_CONFIDENCES.find((value) => value === confidence);
      return key ? tConfidence(key) : confidence;
    },
  };
}
