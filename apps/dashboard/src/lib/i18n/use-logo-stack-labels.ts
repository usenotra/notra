import type { LogoStackLabels } from "@notra/ui/types/geo";
import { useTranslations } from "use-intl";

export function useLogoStackLabels(): LogoStackLabels {
  const t = useTranslations("ui.logoStack");
  const tStates = useTranslations("common.states");

  return {
    none: tStates("none"),
    additionalItems: t("additionalItems"),
    showAdditionalItems: (count) => t("showAdditionalItems", { count }),
  };
}
