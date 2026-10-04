"use client";

import { FEATURES, PAID_OR_LEGACY_PLAN_IDS } from "@notra/ai/billing/features";

import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";

/**
 * Reads the zero data retention entitlement from Autumn. `hasZdr` is false
 * while loading; check `isLoading` before treating it as a final answer.
 */
export function useHasZdrEntitlement() {
  const { check, data: customer, isLoading } = useBillingCustomer();
  const hasZdr = check({ featureId: FEATURES.ZDR }).allowed === true;
  return {
    hasZdr,
    isLoading,
    canUseNonZdr: Boolean(customer) && !isLoading && !hasZdr,
  };
}

export function useHasAiCreditsFeature() {
  const { data: customer, isLoading } = useBillingCustomer();
  const hasAiCredits = Boolean(customer?.balances?.[FEATURES.AI_CREDITS]);
  return { hasAiCredits, isLoading };
}

export function useHasGeoFeature() {
  const {
    data: customer,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useBillingCustomer();
  const hasGeo = Boolean(customer?.balances?.[FEATURES.AI_ANSWERS]);
  const isUnavailable = Boolean(error) || (!isLoading && !customer);
  const isLocked = !isLoading && !isUnavailable && !!customer && !hasGeo;
  return { hasGeo, isLocked, isLoading, isUnavailable, isFetching, refetch };
}

/**
 * Mirrors the server's active-plan check (a paid or legacy plan, or AI
 * credits left) so paid-only actions can say so before the user fills a form.
 * Not locked while loading or without billing; the server still enforces it.
 */
export function useHasActivePlan() {
  const { data: customer, isLoading } = useBillingCustomer();
  const hasPaidPlan =
    customer?.subscriptions.some(
      (subscription) =>
        !subscription.addOn &&
        subscription.status === "active" &&
        PAID_OR_LEGACY_PLAN_IDS.has(subscription.planId)
    ) ?? false;
  const credits = customer?.balances?.[FEATURES.AI_CREDITS];
  const hasCredits =
    typeof credits?.remaining === "number" && credits.remaining > 0;
  return {
    isLocked: !isLoading && Boolean(customer) && !hasPaidPlan && !hasCredits,
    isLoading,
  };
}
