"use client";

import { Databuddy } from "@databuddy/sdk/react";
import { isDemoModeClient } from "@notra/utils/demo-mode";

import {
  DATABUDDY_DASHBOARD_WEBSITE_ID,
  DATABUDDY_DEMO_WEBSITE_ID,
} from "@/constants/databuddy";
import {
  DATABUDDY_DASHBOARD_MASK_PATTERNS,
  normalizeDatabuddyEventPath,
} from "@/utils/databuddy";

const databuddyClientId = isDemoModeClient()
  ? DATABUDDY_DEMO_WEBSITE_ID
  : DATABUDDY_DASHBOARD_WEBSITE_ID;

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
