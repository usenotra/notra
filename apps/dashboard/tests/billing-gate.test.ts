import { describe, expect, mock, test } from "bun:test";

let started = 0;

mock.module("@/lib/auth/actions", () => ({
  getAllUserOrganizations: async () => [
    { id: "org-a", slug: "alpha" },
    { id: "org-b", slug: "beta" },
  ],
}));

mock.module("@/lib/billing/subscription", () => ({
  hasPaidSubscriptionHistory: async (organizationId: string) => {
    started += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(started).toBe(2);
    return organizationId === "org-b";
  },
  // Other files in this process import the real module. A partial mock hides
  // those exports and fails their suites while this file is loaded.
  hasAiCreditsGrant: async () => false,
  resolveZdrEntitlement: async () => "unknown",
  resolveAiProductAccess: async () => ({
    hasAccess: true,
    activePlanId: null,
  }),
  assertActiveSubscription: async () => undefined,
  resolveGeoEntitlement: async () => "skipped",
  rejectGeoEntitlementDenied: () => {
    throw new Error("GEO entitlement denied");
  },
  assertGeoEntitlement: async () => undefined,
}));

const { findFirstPaidOrganization } =
  await import("../src/lib/onboarding/first-paid-organization");

describe("findFirstPaidOrganization", () => {
  test("starts paid-history checks in parallel and returns the first paid org", async () => {
    started = 0;
    await expect(findFirstPaidOrganization()).resolves.toEqual({
      id: "org-b",
      slug: "beta",
    });
  });
});
