import { useTranslations } from "use-intl";

import type { WriteDialogSectionId } from "@/types/components/geo-writer";

export function useWriteSectionLabels(): Record<WriteDialogSectionId, string> {
  const tLabels = useTranslations("common.labels");
  const tGeoShared = useTranslations("geo.shared");
  return {
    prompt: tGeoShared("prompt"),
    type: tLabels("format"),
    brand: tLabels("brandIdentity"),
    sitemap: tLabels("sitemap"),
    competitors: tLabels("competitors"),
  };
}
