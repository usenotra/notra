import { useTranslations } from "use-intl";

import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import type { GeoScanActivityStatusProps } from "@/types/geo-scan-activity";
import { hasScanActivityStatus } from "@/utils/geo-scan-activity";

/** One-line note above the answers when the last scan stopped early. */
export function ScanActivityStatus({ run }: GeoScanActivityStatusProps) {
  const t = useTranslations("geo.scanActivityStatus");
  const formatRelative = useFormatRelative();
  if (!(run && hasScanActivityStatus(run))) {
    return null;
  }

  return (
    <p className="text-muted-foreground min-w-0 truncate text-sm">
      {t("failed", { when: formatRelative(run.finishedAt ?? run.startedAt) })}
    </p>
  );
}
