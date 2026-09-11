"use client";

import { FEATURES } from "@notra/ai/billing/features";

import { useAutumnRefreshListener } from "@/lib/hooks/use-autumn-refresh-listener";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";

export function useCreditBalance() {
  const {
    data: customer,
    isLoading,
    refetch,
  } = useBillingCustomer({
    expand: ["balances.feature", "subscriptions.plan"],
  });

  useAutumnRefreshListener(refetch);

  const hasActiveSubscription =
    customer?.subscriptions?.some(
      (sub) => !sub.addOn && sub.status === "active"
    ) ?? false;

  const aiCredits = customer?.balances?.[FEATURES.AI_CREDITS];
  const balance =
    typeof aiCredits?.remaining === "number" ? aiCredits.remaining : null;

  return { isLoading, hasActiveSubscription, balance };
}
