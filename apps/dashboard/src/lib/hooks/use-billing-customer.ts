"use client";

import { useCustomer } from "autumn-js/react";

import { useIsClient } from "@/lib/hooks/use-is-client";
import { billingCustomerOptions } from "@/utils/billing-customer";

/**
 * The customer query never runs during SSR, and on the client it may already
 * be loading or even resolved by the time hydration reaches a component. Until
 * hydration is done, report "loading" so the server HTML and the first client
 * render agree (otherwise billing-gated UI throws React #418).
 */
export function useBillingCustomer(params?: Parameters<typeof useCustomer>[0]) {
  const customer = useCustomer(billingCustomerOptions(params));
  const hydrated = useIsClient();
  if (hydrated) {
    return customer;
  }
  return {
    ...customer,
    data: undefined,
    error: null,
    isLoading: true,
    isFetching: false,
  };
}
