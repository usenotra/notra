import { useTranslations } from "use-intl";

import type { BrandGuidelineColorRole } from "@/types/hooks/brand-guidelines";

export function useBrandColorRoleLabels(): Record<
  BrandGuidelineColorRole,
  string
> {
  const t = useTranslations("brand.guidelines.colorRoles");
  const tLabels = useTranslations("common.labels");
  return {
    primary: t("primary"),
    secondary: t("secondary"),
    accent: t("accent"),
    background: tLabels("background"),
    foreground: t("foreground"),
    neutral: tLabels("neutral"),
    custom: tLabels("custom"),
  };
}
