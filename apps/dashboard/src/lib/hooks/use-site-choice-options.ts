import { useTranslations } from "next-intl";

import type {
  SiteChoiceOption,
  SitePreviewVisibility,
  SitePublishMode,
} from "@/types/sites";

export function useSitePreviewVisibilityOptions(): SiteChoiceOption<SitePreviewVisibility>[] {
  const t = useTranslations("sites.visibility");
  return [
    {
      value: "protected",
      title: t("protected.title"),
      description: t("protected.description"),
      badge: t("recommended"),
    },
    {
      value: "public",
      title: t("public.title"),
      description: t("public.description"),
    },
  ];
}

export function useSitePublishModeOptions(): SiteChoiceOption<SitePublishMode>[] {
  const t = useTranslations("sites.publishModes");
  return [
    {
      value: "pull_request",
      title: t("pull_request.title"),
      description: t("pull_request.description"),
      badge: t("recommended"),
    },
    {
      value: "direct",
      title: t("direct.title"),
      description: t("direct.description"),
    },
  ];
}
