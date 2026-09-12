"use client";

import { FEATURES, PAID_OR_LEGACY_PLAN_IDS } from "@notra/ai/billing/features";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { SidebarGroup } from "@notra/ui/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { PAYWALL_KINDS, PLAN_SURFACES } from "@/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { toAnalyticsRoute } from "@/lib/analytics/route";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import { useSettingsModal } from "@/lib/hooks/use-settings-modal";

export function SidebarTrialExpired() {
  const { activeOrganization } = useOrganizationsContext();
  const { openSettings } = useSettingsModal();
  const { data: customer, isLoading } = useBillingCustomer({
    expand: ["balances.feature", "subscriptions.plan"],
  });
  const pathname = usePathname();
  const route = toAnalyticsRoute(pathname, activeOrganization?.slug);
  const shownRef = useRef(false);

  const hasActiveSubscription = Boolean(
    customer?.subscriptions.some(
      (subscription) =>
        !subscription.addOn &&
        subscription.status === "active" &&
        PAID_OR_LEGACY_PLAN_IDS.has(subscription.planId)
    )
  );

  const aiCredits = customer?.balances?.[FEATURES.AI_CREDITS];
  const hasCreditsBalance =
    typeof aiCredits?.remaining === "number" && aiCredits.remaining > 0;

  const isVisible =
    !isLoading &&
    customer !== null &&
    customer !== undefined &&
    !hasActiveSubscription &&
    !hasCreditsBalance;

  useEffect(() => {
    if (!isVisible || shownRef.current) {
      return;
    }
    shownRef.current = true;
    trackEvent(POSTHOG_EVENTS.PAYWALL_SHOWN, {
      kind: PAYWALL_KINDS.TRIAL_EXPIRED,
      plan_id: null,
      route,
    });
  }, [isVisible, route]);

  if (!isVisible) {
    return null;
  }

  return (
    <SidebarGroup className="px-3 pb-2 group-data-[collapsible=icon]:hidden">
      <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
        <div className="bg-muted/50 border-b px-3 py-3">
          <p className="text-sm font-semibold">Trial Ended</p>
        </div>
        <div className="space-y-3 p-3">
          <p className="text-muted-foreground text-xs">
            Your trial has ended. Subscribe to a plan to unlock full access.
            You&apos;re currently in read-only mode.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              trackEvent(POSTHOG_EVENTS.UPGRADE_CLICKED, {
                surface: PLAN_SURFACES.SIDEBAR_TRIAL_EXPIRED,
                target_plan: null,
                interval: null,
                zdr: false,
              });
              openSettings("billing");
            }}
            size="sm"
          >
            Choose a Plan
          </Button>
        </div>
      </div>
    </SidebarGroup>
  );
}
