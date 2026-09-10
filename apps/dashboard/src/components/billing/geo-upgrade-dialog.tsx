"use client";

import {
  GEO_UPGRADE_DESCRIPTION,
  GEO_UPGRADE_TITLE,
} from "@notra/geo-core/constants/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Badge } from "@notra/ui/components/ui/badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { useListPlans } from "autumn-js/react";
import { useState } from "react";
import { toast } from "sonner";

import { PlanCard } from "@/components/billing/plan-card";
import { PAYWALL_KINDS, PLAN_SURFACES } from "@/constants/analytics-events";
import { FEATURED_PLAN_TIER } from "@/constants/billing";
import {
  billingInterval,
  planSelectedProperties,
} from "@/lib/analytics/billing-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { attachPlanWithAddons } from "@/lib/billing/attach-plan";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import type { BillingPlanGroup } from "@/types/billing/plan";
import type { GeoUpgradeDialogProps } from "@/types/components/geo";
import {
  findZdrAddonPlan,
  getPricingButtonText,
  getProductFeatures,
  getProductPrice,
  groupBillingPlans,
  planGroupDescription,
  selectPlanVariant,
  zdrAddonToggle,
} from "@/utils/billing-plans";

export function GeoUpgradeDialog({
  slug,
  open,
  onOpenChange,
}: GeoUpgradeDialogProps) {
  const { data: plans, isLoading: plansLoading } = useListPlans({
    queryOptions: { enabled: open },
  });
  const { attach, multiAttach, refetch } = useBillingCustomer();
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [includeZdr, setIncludeZdr] = useState(false);

  const planGroups = groupBillingPlans(plans);
  const intervalLabel = isYearly ? "year" : "month";

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      trackEvent(POSTHOG_EVENTS.PAYWALL_DISMISSED, {
        kind: PAYWALL_KINDS.GEO_LOCKED,
      });
    }
    onOpenChange(nextOpen);
  }

  function handleIntervalChange(value: string) {
    const yearly = value === "yearly";
    trackEvent(POSTHOG_EVENTS.PRICING_INTERVAL_TOGGLED, {
      interval: billingInterval(yearly),
      surface: PLAN_SURFACES.GEO_PAYWALL,
    });
    setIsYearly(yearly);
  }

  function handleIncludeZdrChange(checked: boolean) {
    trackEvent(POSTHOG_EVENTS.ZDR_ADDON_TOGGLED, {
      enabled: checked,
      surface: PLAN_SURFACES.GEO_PAYWALL,
    });
    setIncludeZdr(checked);
  }

  async function handleSelectPlan(planId: string) {
    setLoading(planId);
    trackEvent(
      POSTHOG_EVENTS.PLAN_SELECTED,
      planSelectedProperties({
        plans,
        planId,
        isYearly,
        includeZdr,
        surface: PLAN_SURFACES.GEO_PAYWALL,
      })
    );
    try {
      const result = await attachPlanWithAddons({
        attach,
        multiAttach,
        planId,
        includeZdr,
        successUrl: `${window.location.origin}/${slug}/geo`,
      });
      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }
      await refetch();
    } catch (err) {
      trackEvent(POSTHOG_EVENTS.CHECKOUT_FAILED, {
        plan_id: planId,
        surface: PLAN_SURFACES.GEO_PAYWALL,
      });
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not start checkout. Please try again."
      );
    }
    setLoading(null);
  }

  function renderPlanCard(group: BillingPlanGroup) {
    const plan = selectPlanVariant(group, isYearly);
    if (!plan) {
      return null;
    }
    const featured = group.id === FEATURED_PLAN_TIER;
    let label = getPricingButtonText(plan);
    if (loading === plan.id) {
      label = "Loading...";
    }
    return (
      <PlanCard
        action={featured ? <Badge>Most popular</Badge> : undefined}
        addon={zdrAddonToggle(
          findZdrAddonPlan(plans, plan.id),
          includeZdr,
          handleIncludeZdrChange
        )}
        button={{
          label,
          disabled: loading !== null,
          variant: featured ? "default" : "outline",
          onClick: () => handleSelectPlan(plan.id),
        }}
        description={planGroupDescription(group)}
        featured={featured}
        features={getProductFeatures(plan)}
        highlighted={false}
        intervalLabel={intervalLabel}
        key={group.id}
        name={group.name}
        price={getProductPrice(plan).amount}
      />
    );
  }

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogContent className="flex max-h-[90svh] flex-col overflow-hidden sm:max-w-5xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{GEO_UPGRADE_TITLE}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {GEO_UPGRADE_DESCRIPTION}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex justify-center">
          <Tabs
            onValueChange={handleIntervalChange}
            value={isYearly ? "yearly" : "monthly"}
          >
            <TabsList variant="line">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger className="flex items-center gap-1.5" value="yearly">
                Yearly
                <span className="bg-success/10 text-success rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                  Save 20%
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
          {plansLoading ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <Skeleton className="h-96 rounded-lg" />
              <Skeleton className="h-96 rounded-lg" />
              <Skeleton className="h-96 rounded-lg" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {planGroups.map(renderPlanCard)}
            </div>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
