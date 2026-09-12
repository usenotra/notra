import type { geoSettings } from "@notra/db/schema";

export type ScanSettingsInput = Partial<
  Pick<
    typeof geoSettings.$inferInsert,
    | "organizationId"
    | "enabled"
    | "scanIntervalHours"
    | "nextScanAt"
    | "scanLeaseUntil"
    | "scanStartedAt"
    | "lastScanAt"
  >
>;
