import { useTranslations } from "next-intl";

import type { AnalyticsRangePresetLabels } from "@/types/analytics";

export function useAnalyticsRangeLabels(): AnalyticsRangePresetLabels {
  const t = useTranslations("analytics.ranges");
  const tLabels = useTranslations("common.labels");
  return {
    today: {
      label: tLabels("today"),
      compact: tLabels("today"),
      hint: t("today.hint"),
    },
    yesterday: {
      label: tLabels("yesterday"),
      compact: tLabels("yesterday"),
      hint: t("yesterday.hint"),
    },
    "7d": {
      label: tLabels("last7Days"),
      compact: tLabels("n7d"),
      hint: t("7d.hint"),
    },
    "30d": {
      label: tLabels("last30Days"),
      compact: tLabels("n30d"),
      hint: t("30d.hint"),
    },
    "90d": {
      label: tLabels("last90Days"),
      compact: tLabels("n90d"),
      hint: t("90d.hint"),
    },
    mtd: {
      label: t("mtd.label"),
      compact: t("mtd.compact"),
      hint: t("mtd.hint"),
    },
    qtd: {
      label: t("qtd.label"),
      compact: t("qtd.compact"),
      hint: t("qtd.hint"),
    },
    ytd: {
      label: tLabels("yearToDate"),
      compact: t("ytd.compact"),
      hint: t("ytd.hint"),
    },
    all: {
      label: t("all.label"),
      compact: tLabels("allTime"),
      hint: t("all.hint"),
    },
  };
}
