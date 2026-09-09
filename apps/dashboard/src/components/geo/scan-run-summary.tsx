import type { GeoScanRunSummaryProps } from "@/types/geo-scan-activity";
import { geoRunMissingAnswers } from "@/utils/geo-scan-activity";

export function ScanRunSummary({ run }: GeoScanRunSummaryProps) {
  const missing = geoRunMissingAnswers(run);
  if (run.status !== "failed" && missing === 0) {
    return null;
  }
  return (
    <p className="text-warning text-sm" role="status">
      {run.status === "failed" ? "This scan stopped before finishing. " : ""}
      {missing > 0 ? `${missing} planned checks have no saved answer. ` : ""}
      Captured answers are available below.
    </p>
  );
}
