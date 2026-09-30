import { useTranslations } from "next-intl";

import type { SettingsNavLabels } from "@/types/settings/modal";

export function useSettingsNavLabels(): SettingsNavLabels {
  const t = useTranslations("settings");
  const tLabels = useTranslations("common.labels");
  const brandDescription = t("shared.nameAliasesAndConversionPaths");
  const brandModalDescription = t("shared.howYourBrandIsIdentified");
  return {
    groups: {
      account: tLabels("account"),
      organization: tLabels("organization"),
      billing: tLabels("billing"),
      geo: tLabels("geo"),
      dev: t("nav.groups.dev"),
    },
    sections: {
      account: {
        label: tLabels("account"),
        description: t("nav.sections.account.description"),
        modalDescription: t("modal.descriptions.account"),
      },
      appearance: {
        label: t("nav.sections.appearance.label"),
        description: t("nav.sections.appearance.description"),
        modalDescription: t("modal.descriptions.appearance"),
      },
      general: {
        label: t("nav.sections.general.label"),
        description: t("nav.sections.general.description"),
        modalDescription: t("modal.descriptions.general"),
      },
      members: {
        label: tLabels("members"),
        description: t("nav.sections.members.description"),
        modalDescription: t("modal.descriptions.members"),
      },
      notifications: {
        label: tLabels("notifications"),
        description: t("nav.sections.notifications.description"),
        modalDescription: t("modal.descriptions.notifications"),
      },
      attachments: {
        label: t("nav.sections.attachments.label"),
        description: t("nav.sections.attachments.description"),
        modalDescription: t("modal.descriptions.attachments"),
      },
      billing: {
        label: tLabels("billing"),
        description: t("nav.sections.billing.description"),
        modalDescription: t("modal.descriptions.billing"),
      },
      usage: {
        label: tLabels("usage"),
        description: t("nav.sections.usage.description"),
        modalDescription: t("modal.descriptions.usage"),
      },
      "usage-alerts": {
        label: tLabels("usageAlerts"),
        description: t("nav.sections.usage-alerts.description"),
        modalDescription: t("modal.descriptions.usage-alerts"),
      },
      credits: {
        label: tLabels("credits"),
        description: t("nav.sections.credits.description"),
        modalDescription: t("modal.descriptions.credits"),
      },
      logs: {
        label: tLabels("logs"),
        description: t("nav.sections.logs.description"),
        modalDescription: t("modal.descriptions.logs"),
      },
      dev: {
        label: t("nav.sections.dev.label"),
        description: t("nav.sections.dev.description"),
        modalDescription: t("modal.descriptions.dev"),
      },
      geo: {
        label: tLabels("brand"),
        description: brandDescription,
        modalDescription: brandModalDescription,
      },
      "geo-brand": {
        label: tLabels("brand"),
        description: brandDescription,
        modalDescription: brandModalDescription,
      },
      "geo-languages": {
        label: tLabels("languages"),
        description: t("nav.sections.geo-languages.description"),
        modalDescription: t("modal.descriptions.geo-languages"),
      },
      "geo-models": {
        label: tLabels("models"),
        description: t("nav.sections.geo-models.description"),
        modalDescription: t("modal.descriptions.geo-models"),
      },
    },
  };
}
