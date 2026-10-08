import { useTranslations } from "use-intl";

import type { SiteChoiceOption, SitePublishMode } from "@/types/sites";

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
