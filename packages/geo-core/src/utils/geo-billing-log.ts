import { geoLog } from "@notra/ai/evlog";

import { describeGeoError } from "./geo-log";

export function logGeoBillingFailure(
  action: "release" | "confirm",
  projectId: string,
  runId: string,
  error: unknown
): void {
  geoLog.error({
    event: "geo.scan.billing_failed",
    action,
    projectId,
    runId,
    ...describeGeoError(error),
  });
}
