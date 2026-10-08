"use client";

import { useTranslations } from "use-intl";

import { EmptyState } from "@/components/empty-state";

export function SitesUnavailableState() {
  const t = useTranslations("sites.unavailable");
  return <EmptyState description={t("description")} title={t("title")} />;
}
