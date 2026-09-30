import type { GeoPromptIntent } from "@notra/geo-core/types/geo";
import { useTranslations } from "next-intl";

export function useGeoPromptIntentLabel() {
  const t = useTranslations("geo.promptBadges");
  const tLabels = useTranslations("common.labels");
  const labels: Record<GeoPromptIntent, string> = {
    comparison: tLabels("comparison"),
    list: tLabels("list"),
    how_to: t("intent.how_to"),
    question: tLabels("question"),
    other: tLabels("otherNeuter"),
  };
  return (intent: GeoPromptIntent) => labels[intent];
}
