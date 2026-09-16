import { afterEach, beforeEach, expect, mock, test } from "bun:test";

import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Button } from "../src/components/button";

const ActualButton = Button;
let subscriptions = [{ planId: "free", status: "active", addOn: false }];
let customerLoading = false;
let customerMissing = false;
const openSettings = mock();
const attach = mock();
let upgradeClick: ComponentProps<typeof Button>["onClick"];
const originalFlag = process.env.NEXT_PUBLIC_SHOW_UPGRADE_BUTTON;

mock.module("@/components/button", () => ({
  Button: (props: ComponentProps<typeof Button>) => {
    upgradeClick = props.onClick;
    return <ActualButton {...props} />;
  },
}));
mock.module("@/components/providers/organization-provider", () => ({
  useOrganizationsContext: () => ({
    activeOrganization: { id: "org-free", slug: "free-org" },
  }),
}));
mock.module("@/lib/hooks/use-billing-customer", () => ({
  useBillingCustomer: () => ({
    data: customerMissing
      ? undefined
      : { subscriptions, balances: { ai_credits: { remaining: 500 } } },
    isLoading: customerLoading,
    attach,
    refetch: mock(),
  }),
}));
mock.module("autumn-js/react", () => ({
  useListPlans: () => ({ data: undefined, isLoading: true }),
}));
mock.module("@/lib/hooks/use-onboarding", () => ({
  useOnboardingStatus: () => ({ data: undefined }),
}));
mock.module("@/lib/hooks/use-settings-modal", () => ({
  useSettingsModal: () => ({ openSettings }),
}));
mock.module("next/navigation", () => ({
  usePathname: () => "/free-org/feedback",
}));
mock.module("@/lib/analytics/posthog-client", () => ({
  trackEvent: mock(),
  flushTrackEvent: mock(),
}));
mock.module("@/components/onboarding/step-view-tracker", () => ({
  OnboardingStepViewTracker: () => null,
}));

const { SidebarUpgrade } =
  await import("../src/components/dashboard/sidebar-upgrade");
const { PricingClient } = await import("../src/app/onboarding/pricing-client");

beforeEach(() => {
  process.env.NEXT_PUBLIC_SHOW_UPGRADE_BUTTON = "false";
  subscriptions = [{ planId: "free", status: "active", addOn: false }];
  customerLoading = false;
  customerMissing = false;
  openSettings.mockClear();
  attach.mockClear();
});

afterEach(() => {
  if (originalFlag === undefined) {
    delete process.env.NEXT_PUBLIC_SHOW_UPGRADE_BUTTON;
  } else {
    process.env.NEXT_PUBLIC_SHOW_UPGRADE_BUTTON = originalFlag;
  }
});

test.each(["free", "no-plan", "expired", "add-on"])(
  "%s gets a free CTA without onboarding, plan data, or upgrade flag, even with credits",
  async (state) => {
    if (state === "no-plan") {
      subscriptions = [];
    }
    if (state === "expired") {
      subscriptions = [{ planId: "starter", status: "expired", addOn: false }];
    }
    if (state === "add-on") {
      subscriptions = [{ planId: "starter", status: "active", addOn: true }];
    }
    const html = renderToStaticMarkup(<SidebarUpgrade />);
    expect(html).toContain("Feedback is free.");
    expect(html).toContain("Upgrade now");
    expect(html).not.toContain("Trial Ended");
    expect(html).not.toContain("read-only");
    expect(upgradeClick).toBeDefined();
    await upgradeClick?.({} as Parameters<NonNullable<typeof upgradeClick>>[0]);
    expect(openSettings).toHaveBeenCalledWith("billing");
    expect(attach).not.toHaveBeenCalled();
  }
);

test("an active paid plan alongside free does not get the free CTA", () => {
  subscriptions.push({ planId: "starter", status: "active", addOn: false });
  expect(renderToStaticMarkup(<SidebarUpgrade />)).toBe("");
});

test("billing loading or missing does not misclassify a customer as free", () => {
  customerLoading = true;
  expect(renderToStaticMarkup(<SidebarUpgrade />)).toBe("");
  customerLoading = false;
  customerMissing = true;
  expect(renderToStaticMarkup(<SidebarUpgrade />)).toBe("");
});

test("onboarding offers a direct free feedback link even while plans load", () => {
  const html = renderToStaticMarkup(<PricingClient slug="free-org" />);
  expect(html).toContain('href="/free-org/feedback"');
  expect(html).toContain("Continue with free feedback");
  expect(html).not.toContain("Pick a plan to start using Notra");
  expect(attach).not.toHaveBeenCalled();
});
