import type { BlogPostSubtype } from "@notra/db/types/content";
import { useTranslations } from "use-intl";

export function useBlogPostSubtypeLabels(): Record<BlogPostSubtype, string> {
  const t = useTranslations("content.plan.subtypes");
  const tLabels = useTranslations("common.labels");
  const tShared = useTranslations("content.shared");
  return {
    guide: tLabels("guide"),
    comparison: tLabels("comparison"),
    listicle: tLabels("listicle"),
    "how-to": t("how-to"),
    faq: tShared("faq"),
    alternatives: t("alternatives"),
  };
}
