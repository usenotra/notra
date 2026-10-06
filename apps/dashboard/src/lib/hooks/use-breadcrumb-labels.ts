import { useTranslations } from "use-intl";

import type { BreadcrumbLabels } from "@/types/dashboard/breadcrumbs";

export function useBreadcrumbLabels(): BreadcrumbLabels {
  const t = useTranslations("dashboard.breadcrumbs");
  const tLabels = useTranslations("common.labels");
  const tActions = useTranslations("common.actions");
  return {
    geo: t("geo"),
    segments: {
      accounts: tLabels("accounts"),
      analytics: tLabels("analytics"),
      "api-keys": tLabels("apiKeys"),
      automation: tLabels("automation"),
      billing: tLabels("billing"),
      brand: tLabels("brand"),
      chat: tLabels("chat"),
      collection: t("segments.collection"),
      content: tLabels("content"),
      events: tLabels("events"),
      feedback: tLabels("feedback"),
      identity: tLabels("brandIdentityTitle"),
      integrations: tLabels("integrations"),
      iris: tLabels("iris"),
      leaderboard: tLabels("leaderboard"),
      schedules: tLabels("schedules"),
      settings: tActions("settings"),
      skills: tLabels("skills"),
      usage: tLabels("usage"),
    },
    geoSegments: {
      "agent-readiness": t("geoSegments.agent-readiness"),
      competitors: tLabels("competitors"),
      directions: t("geoSegments.directions"),
      gaps: t("geoSegments.gaps"),
      personas: tLabels("personas"),
      prompts: tLabels("prompts"),
      settings: tLabels("geoSettings"),
      "shelf-space": t("geoSegments.shelf-space"),
      traffic: tLabels("traffic"),
      write: tLabels("write"),
    },
    geoTabs: {
      visibility: tLabels("visibility"),
      "brand-sentiment": tLabels("brandSentiment"),
      journeys: tLabels("journeys"),
    },
  };
}
