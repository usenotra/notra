"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { SidebarGroup } from "@notra/ui/components/ui/sidebar";
import { useListPlans } from "autumn-js/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { PAYWALL_KINDS, PLAN_SURFACES } from "@/constants/analytics-events";
import { billingInterval } from "@/lib/analytics/billing-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { toAnalyticsRoute } from "@/lib/analytics/route";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import { useOnboardingStatus } from "@/lib/hooks/use-onboarding";
import { groupBillingPlans, nextPlanGroup } from "@/utils/billing-plans";
import {
  canShowSidebarUpgrade,
  sidebarUpgradeCopy,
} from "@/utils/sidebar-upgrade";

export function SidebarUpgrade() {
  const { activeOrganization } = useOrganizationsContext();
  const orgId = activeOrganization?.id ?? "";

  const { data: onboarding } = useOnboardingStatus(orgId);
  const canShowUpgrade = canShowSidebarUpgrade(
    onboarding?.onboardingCompleted,
    onboarding?.onboardingDismissed
  );
  const {
    attach,
    data: customer,
    refetch,
  } = useBillingCustomer({
    expand: ["subscriptions.plan"],
  });
  const { data: plans } = useListPlans({
    queryOptions: {
      enabled: canShowUpgrade,
    },
  });
  const [loading, setLoading] = useState(false);

  const activeSubscription = customer?.subscriptions.find(
    (subscription) => !subscription.addOn && subscription.status === "active"
  );
  const activePlanId =
    activeSubscription?.plan?.id ?? activeSubscription?.planId;
  const hasNoPlan = !activePlanId;

  const targetGroup = nextPlanGroup(groupBillingPlans(plans), activePlanId);
  const targetPlan = targetGroup?.monthly ?? targetGroup?.annual ?? null;

  const showTrial =
    hasNoPlan &&
    !!targetPlan?.freeTrial &&
    !!targetPlan.customerEligibility?.trialAvailable;

  const { buttonLabel, description, heading } = sidebarUpgradeCopy({
    hasNoPlan,
    isLoading: loading,
    planName: targetGroup?.name,
    showTrial,
  });

  const isVisible = canShowUpgrade && targetPlan !== null;
  const pathname = usePathname();
  const route = toAnalyticsRoute(pathname, activeOrganization?.slug);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!isVisible || shownRef.current) {
      return;
    }
    shownRef.current = true;
    trackEvent(POSTHOG_EVENTS.PAYWALL_SHOWN, {
      kind: PAYWALL_KINDS.UPGRADE_CARD,
      plan_id: activePlanId ?? null,
      route,
    });
  }, [isVisible, activePlanId, route]);

  if (!(isVisible && targetPlan)) {
    return null;
  }

  async function handleUpgrade() {
    if (!targetPlan) {
      return;
    }
    setLoading(true);
    trackEvent(POSTHOG_EVENTS.UPGRADE_CLICKED, {
      surface: PLAN_SURFACES.SIDEBAR,
      target_plan: targetPlan.id,
      interval: billingInterval(targetGroup?.monthly === null),
      zdr: false,
    });
    const successUrl = activeOrganization?.slug
      ? `${window.location.origin}/${activeOrganization.slug}/settings/billing/success`
      : undefined;
    try {
      const result = await attach({
        planId: targetPlan.id,
        redirectMode: "if_required",
        successUrl,
      });
      if (result.paymentUrl) {
        trackEvent(POSTHOG_EVENTS.CHECKOUT_REDIRECTED, {
          plan_id: targetPlan.id,
          zdr: false,
        });
        window.location.assign(result.paymentUrl);
      } else {
        await refetch();
      }
    } catch (err) {
      setLoading(false);
      trackEvent(POSTHOG_EVENTS.CHECKOUT_FAILED, {
        plan_id: targetPlan.id,
        surface: PLAN_SURFACES.SIDEBAR,
      });
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not update billing. Please try again."
      );
      return;
    }
    setLoading(false);
  }

  return (
    <SidebarGroup className="px-3 pb-2 group-data-[collapsible=icon]:hidden">
      <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
        <div className="bg-muted/50 border-b px-3 py-3">
          <p className="text-sm font-semibold">{heading}</p>
        </div>
        <div className="space-y-3 p-3">
          <p className="text-muted-foreground text-xs">{description}</p>
          <Button
            className="w-full"
            disabled={loading}
            onClick={handleUpgrade}
            size="sm"
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </SidebarGroup>
  );
}
