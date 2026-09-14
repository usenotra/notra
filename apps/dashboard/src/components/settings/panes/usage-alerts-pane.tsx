"use client";

import { UsageAlertsSection } from "@/components/billing/usage-alerts-section";
import { SettingsPane } from "@/components/settings/settings-pane";
import { useAutumnRefreshListener } from "@/lib/hooks/use-autumn-refresh-listener";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import {
  featuresFromBalances,
  isRetentionFeature,
} from "@/utils/billing-usage";
import { normalizeUsageAlerts } from "@/utils/usage-alerts";

export function UsageAlertsSettingsPane() {
  const {
    data: customer,
    isLoading,
    refetch,
  } = useBillingCustomer({
    expand: ["balances.feature"],
  });
  useAutumnRefreshListener(refetch);

  const features = featuresFromBalances(customer?.balances).filter(
    (feature) => !isRetentionFeature(feature)
  );

  return (
    <SettingsPane>
      <UsageAlertsSection
        alerts={normalizeUsageAlerts(customer?.billingControls?.usageAlerts)}
        features={features}
        loading={isLoading}
        onUpdated={refetch}
      />
    </SettingsPane>
  );
}
