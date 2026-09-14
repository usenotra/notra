"use client";

import { Databuddy } from "@databuddy/sdk/react";

import {
  DATABUDDY_DASHBOARD_MASK_PATTERNS,
  normalizeDatabuddyEventPath,
} from "@/utils/databuddy";

const databuddyClientId =
  process.env.NEXT_PUBLIC_DATABUDDY_DASHBOARD_WEBSITE_ID;

export function DatabuddyAnalytics() {
  if (!databuddyClientId) {
    return null;
  }

  return (
    <Databuddy
      clientId={databuddyClientId}
      filter={normalizeDatabuddyEventPath}
      maskPatterns={DATABUDDY_DASHBOARD_MASK_PATTERNS}
      trackAttributes={true}
      trackErrors={true}
      trackHashChanges={true}
    />
  );
}
