import type { useTranslations } from "next-intl";

export type GeoEngineAnswerMode = "withoutSearch";

export type GeoMentionTrendEmptyState = "trend.noVisibility" | "notScanned";

export type GeoSharedTranslator = ReturnType<
  typeof useTranslations<"geo.shared">
>;
