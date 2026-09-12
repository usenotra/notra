"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Badge } from "@notra/ui/components/ui/badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { useListPlans } from "autumn-js/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PlanCard } from "@/components/billing/plan-card";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { OnboardingStepViewTracker } from "@/components/onboarding/step-view-tracker";
import { ONBOARDING_STEPS, PLAN_SURFACES } from "@/constants/analytics-events";
import { FEATURED_PLAN_TIER } from "@/constants/billing";
import { ONBOARDING_STEP_PRICING } from "@/constants/onboarding";
import {
  billingInterval,
  planSelectedProperties,
} from "@/lib/analytics/billing-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { attachPlanWithAddons } from "@/lib/billing/attach-plan";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import type { BillingPlanGroup } from "@/types/billing/plan";
import type { PricingClientProps } from "@/types/onboarding";
import {
  findZdrAddonPlan,
  getProductFeatures,
  getProductPrice,
  groupBillingPlans,
  planGroupDescription,
  selectPlanVariant,
  zdrAddonToggle,
} from "@/utils/billing-plans";

export function PricingClient({ slug }: PricingClientProps) {
  const { data: plans, isLoading: plansLoading } = useListPlans();
  const { attach, multiAttach } = useBillingCustomer();
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [includeZdr, setIncludeZdr] = useState(false);

  const planGroups = groupBillingPlans(plans);
  const intervalLabel = isYearly ? "year" : "month";
  const pricingViewedRef = useRef(false);

  useEffect(() => {
    if (plansLoading || pricingViewedRef.current) {
      return;
    }
    pricingViewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.PRICING_VIEWED, {
      trial_available: Boolean(
        plans?.some(
          (plan) => plan.freeTrial && plan.customerEligibility?.trialAvailable
        )
      ),
      has_paid_history: false,
      surface: PLAN_SURFACES.ONBOARDING,
    });
  }, [plansLoading, plans]);

  function handleIntervalChange(value: string) {
    const yearly = value === "yearly";
    trackEvent(POSTHOG_EVENTS.PRICING_INTERVAL_TOGGLED, {
      interval: billingInterval(yearly),
      surface: PLAN_SURFACES.ONBOARDING,
    });
    setIsYearly(yearly);
  }

  function handleIncludeZdrChange(checked: boolean) {
    trackEvent(POSTHOG_EVENTS.ZDR_ADDON_TOGGLED, {
      enabled: checked,
      surface: PLAN_SURFACES.ONBOARDING,
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
        surface: PLAN_SURFACES.ONBOARDING,
      })
    );
    try {
      const successUrl = `${window.location.origin}/${slug}/settings/billing/success`;
      const result = await attachPlanWithAddons({
        attach,
        multiAttach,
        planId,
        includeZdr,
        successUrl,
      });

      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
      } else {
        window.location.assign(`/${slug}`);
      }
    } catch (err) {
      trackEvent(POSTHOG_EVENTS.CHECKOUT_FAILED, {
        plan_id: planId,
        surface: PLAN_SURFACES.ONBOARDING,
      });
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not start checkout. Please try again."
      );
      setLoading(null);
    }
  }

  function renderPlanCard(group: BillingPlanGroup) {
    const plan = selectPlanVariant(group, isYearly);
    if (!plan) {
      return null;
    }
    const featured = group.id === FEATURED_PLAN_TIER;
    const hasTrial = Boolean(
      plan.freeTrial && plan.customerEligibility?.trialAvailable
    );
    let action: React.ReactNode;
    if (hasTrial) {
      action = <Badge variant="outline">Free trial</Badge>;
    } else if (featured) {
      action = <Badge>Most popular</Badge>;
    }
    let label = hasTrial ? "Start free trial" : "Get started";
    if (loading === plan.id) {
      label = "Loading...";
    }
    return (
      <PlanCard
        action={action}
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
    <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-12">
      <OnboardingStepViewTracker step={ONBOARDING_STEPS.PRICING} />
      <div className="mb-6 flex justify-center">
        <OnboardingProgress current={ONBOARDING_STEP_PRICING} />
      </div>
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Choose your plan
        </h1>
        <p className="text-muted-foreground">
          Pick a plan to start using Notra. You can change or cancel anytime.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
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

      <p className="text-muted-foreground mt-3 text-center text-xs">
        Your plan renews automatically every {intervalLabel} until you cancel.
      </p>

      {plansLoading ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[28rem] rounded-lg" />
          <Skeleton className="h-[28rem] rounded-lg" />
          <Skeleton className="h-[28rem] rounded-lg" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {planGroups.map(renderPlanCard)}
        </div>
      )}
    </div>
  );
}
