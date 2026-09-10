"use client";

import { UsageSection } from "@/components/billing/usage-section";
import { SettingsPane } from "@/components/settings/settings-pane";

export function UsageSettingsPane() {
  return (
    <SettingsPane>
      <UsageSection />
    </SettingsPane>
  );
}
