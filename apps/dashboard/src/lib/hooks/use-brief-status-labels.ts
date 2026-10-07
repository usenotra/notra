import type { GeoContentBriefStatus } from "@notra/db/types/geo-writer";
import { useTranslations } from "use-intl";

export function useBriefStatusLabels(): Record<GeoContentBriefStatus, string> {
  const tLabels = useTranslations("common.labels");
  const tActions = useTranslations("common.actions");
  const tGeoShared = useTranslations("geo.shared");
  return {
    draft: tLabels("draft"),
    approved: tLabels("queued"),
    writing: tGeoShared("writing"),
    completed: tActions("done"),
    failed: tLabels("failed"),
  };
}
