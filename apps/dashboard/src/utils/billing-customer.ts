import type { useCustomer } from "autumn-js/react";

/**
 * Shared `expand` set for every Autumn customer read. Autumn keys its cache by
 * these options, so callers that pass different (or differently ordered) values
 * each open their own request — hence the de-duplication and the sort.
 */
export function billingCustomerOptions(
  params: Parameters<typeof useCustomer>[0] = {}
) {
  return {
    ...params,
    expand: [
      ...new Set([
        "balances.feature",
        "subscriptions.plan",
        ...(params.expand ?? []),
      ]),
    ].sort(),
  } satisfies Parameters<typeof useCustomer>[0];
}
