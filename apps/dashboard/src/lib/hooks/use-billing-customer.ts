"use client";

import { useCustomer } from "autumn-js/react";

import { billingCustomerOptions } from "@/utils/billing-customer";

export function useBillingCustomer(params?: Parameters<typeof useCustomer>[0]) {
  return useCustomer(billingCustomerOptions(params));
}
