import { isDemoModeClient } from "@notra/utils/demo-mode";

// The demo shows what a new workspace sees: flagged features stay off.
export function isAnalyticsVisibleInNav(flagOn: boolean): boolean {
  return (
    !isDemoModeClient() && (flagOn || process.env.NODE_ENV === "development")
  );
}
