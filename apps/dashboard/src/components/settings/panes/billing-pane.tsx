"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Badge } from "@notra/ui/components/ui/badge";
import { DataTableSkeleton } from "@notra/ui/components/ui/data-table";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useListPlans } from "autumn-js/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { InvoicesTable } from "@/components/billing/invoices-table";
import { PlanCard } from "@/components/billing/plan-card";
import { ZdrAddonCard } from "@/components/billing/zdr-addon-card";
import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SettingsPane } from "@/components/settings/settings-pane";
import { PLAN_SURFACES } from "@/constants/analytics-events";
import {
  BILLING_INVOICE_SKELETON_ROWS,
  INVOICE_SKELETON_COLUMN_WIDTHS,
  BILLING_PLAN_FEATURE_SKELETON_KEYS,
  BILLING_PLAN_SKELETON_KEYS,
  FEATURED_PLAN_TIER,
  PLANS_ANCHOR,
} from "@/constants/billing";
import {
  billingInterval,
  planSelectedProperties,
} from "@/lib/analytics/billing-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { attachPlanWithAddons } from "@/lib/billing/attach-plan";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import { useHasZdrEntitlement } from "@/lib/hooks/use-plan";
import type { BillingPlanGroup, PlanCardButton } from "@/types/billing/plan";
import {
  findZdrAddonPlan,
  getPricingButtonText,
  getProductFeatures,
  getProductPrice,
  groupBillingPlans,
  isAnnualPlanId,
  isPlanInGroup,
  planGroupDescription,
  planRenewalTerms,
  selectPlanVariant,
  zdrAddonToggle,
} from "@/utils/billing-plans";

const noop = () => undefined;

function BillingPlanCardSkeleton() {
  return (
    <TitleCard headingAs="div" heading={<Skeleton className="h-5 w-24" />}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-9 w-full rounded-md" />
        <ul className="space-y-2.5 pt-2">
          {BILLING_PLAN_FEATURE_SKELETON_KEYS.map((key) => (
            <li className="flex items-center gap-2" key={key}>
              <Skeleton className="size-4 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-full" />
            </li>
          ))}
        </ul>
      </div>
    </TitleCard>
  );
}

function InvoiceTableSkeleton() {
  return (
    <DataTableSkeleton
      columnWidths={INVOICE_SKELETON_COLUMN_WIDTHS}
      rows={BILLING_INVOICE_SKELETON_ROWS}
    />
  );
}

export function BillingSettingsPane() {
  const t = useTranslations("settings.panes.billing");
  const tSettingsShared = useTranslations("settings.shared");
  const tCommon = useTranslations("common");
  const tBilling = useTranslations("billing");
  const locale = useLocale();
  const { activeOrganization } = useOrganizationsContext();
  const { data: plans, isLoading: plansLoading } = useListPlans();
  const {
    attach,
    multiAttach,
    openCustomerPortal,
    data: customer,
    isLoading: customerLoading,
    refetch,
  } = useBillingCustomer({
    expand: ["invoices", "subscriptions.plan"],
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isYearly, setIsYearly] = useState(false);
  const [includeZdr, setIncludeZdr] = useState(false);
  const { hasZdr } = useHasZdrEntitlement();
  const [now] = useState(() => Date.now());

  const invoices = customer?.invoices;

  const activeSubscription = customer?.subscriptions.find(
    (subscription) => !subscription.addOn && subscription.status === "active"
  );
  const activePlanId =
    activeSubscription?.plan?.id ?? activeSubscription?.planId;

  useEffect(() => {
    if (activePlanId) {
      setIsYearly(isAnnualPlanId(activePlanId));
    }
  }, [activePlanId]);

  const isTrialing =
    activeSubscription?.trialEndsAt != null &&
    activeSubscription.trialEndsAt > now;

  function handleIntervalChange(value: string) {
    const yearly = value === "yearly";
    trackEvent(POSTHOG_EVENTS.PRICING_INTERVAL_TOGGLED, {
      interval: billingInterval(yearly),
      surface: PLAN_SURFACES.BILLING_PAGE,
    });
    setIsYearly(yearly);
  }

  function handleIncludeZdrChange(checked: boolean) {
    trackEvent(POSTHOG_EVENTS.ZDR_ADDON_TOGGLED, {
      enabled: checked,
      surface: PLAN_SURFACES.BILLING_PAGE,
    });
    setIncludeZdr(checked);
  }

  async function handleCheckout(planId: string) {
    setLoading(planId);
    trackEvent(
      POSTHOG_EVENTS.PLAN_SELECTED,
      planSelectedProperties({
        plans,
        planId,
        isYearly,
        includeZdr,
        surface: PLAN_SURFACES.BILLING_PAGE,
      })
    );
    const successUrl = activeOrganization?.slug
      ? `${window.location.origin}/${activeOrganization.slug}/settings/billing/success`
      : undefined;
    try {
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
        await refetch();
      }
    } catch (err) {
      console.error("Attach error:", err);
      trackEvent(POSTHOG_EVENTS.CHECKOUT_FAILED, {
        plan_id: planId,
        surface: PLAN_SURFACES.BILLING_PAGE,
      });
      toast.error(
        err instanceof Error
          ? err.message
          : tCommon("messages.couldNotUpdateBillingPlease")
      );
    }
    setLoading(null);
  }

  async function handleManageSubscription() {
    setPortalLoading(true);
    trackEvent(POSTHOG_EVENTS.CUSTOMER_PORTAL_OPENED, {
      surface: PLAN_SURFACES.BILLING_PAGE,
    });
    const returnUrl = `${window.location.origin}/${activeOrganization?.slug}?settings=billing`;
    try {
      await openCustomerPortal({
        returnUrl,
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : tSettingsShared("couldNotOpenBillingPortal")
      );
    }
    setPortalLoading(false);
  }

  const isBillingLoading = plansLoading || customerLoading;

  const planGroups = groupBillingPlans(plans);
  const trialPlan = planGroups
    .map((group) => group.monthly ?? group.annual)
    .find((plan) => plan?.freeTrial);
  const plansDescription = trialPlan
    ? t("plansDescriptionTrial", { plan: trialPlan.name })
    : t("plansDescription");
  const intervalLabel = isYearly
    ? tCommon("labels.year")
    : tCommon("labels.month");

  function renderManageSubscription() {
    if (customerLoading) {
      return <Skeleton className="h-8 w-40 rounded-md" />;
    }
    if (!activeSubscription) {
      return null;
    }
    return (
      <Button
        disabled={portalLoading}
        onClick={handleManageSubscription}
        size="sm"
        variant="outline"
      >
        {portalLoading ? tCommon("states.loading") : t("manageSubscription")}
      </Button>
    );
  }

  function planButton(group: BillingPlanGroup): PlanCardButton {
    const plan = selectPlanVariant(group, isYearly);
    const variant = group.id === FEATURED_PLAN_TIER ? "default" : "outline";
    if (!plan) {
      return { label: group.name, disabled: true, variant, onClick: noop };
    }
    if (plan.id === activePlanId) {
      return {
        label: isTrialing ? t("trialActive") : t("currentPlan"),
        disabled: true,
        variant,
        onClick: noop,
      };
    }
    return {
      label:
        loading === plan.id
          ? tCommon("states.loading")
          : getPricingButtonText(plan, tBilling),
      disabled: loading !== null,
      variant,
      onClick: () => handleCheckout(plan.id),
    };
  }

  function renderPlanCard(group: BillingPlanGroup) {
    const plan = selectPlanVariant(group, isYearly);
    if (!plan) {
      return null;
    }
    const isCurrent = isPlanInGroup(group, activePlanId);
    const addonPlan = hasZdr ? null : findZdrAddonPlan(plans, plan.id);
    return (
      <PlanCard
        action={
          isCurrent ? (
            <Badge variant={isTrialing ? "outline" : "default"}>
              {isTrialing ? t("trial") : tCommon("labels.current")}
            </Badge>
          ) : undefined
        }
        addon={zdrAddonToggle(
          addonPlan,
          includeZdr,
          handleIncludeZdrChange,
          tBilling,
          locale
        )}
        button={planButton(group)}
        description={planGroupDescription(group, tBilling)}
        featured={group.id === FEATURED_PLAN_TIER}
        features={getProductFeatures(plan, tBilling, locale)}
        highlighted={isCurrent}
        intervalLabel={intervalLabel}
        key={group.id}
        name={group.name}
        price={getProductPrice(plan).amount}
        renewalTerms={
          plan.id === activePlanId ? undefined : planRenewalTerms(plan)
        }
      />
    );
  }

  return (
    <SettingsPane titleAccessory={renderManageSubscription()}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              className="scroll-mt-24 text-lg font-semibold"
              id={PLANS_ANCHOR}
            >
              {t("plans")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isBillingLoading ? t("plansDescription") : plansDescription}
            </p>
          </div>
          <Tabs
            onValueChange={handleIntervalChange}
            value={isYearly ? "yearly" : "monthly"}
          >
            <TabsList aria-label={t("intervalLabel")}>
              <TabsTrigger value="monthly">
                {tCommon("labels.monthly")}
              </TabsTrigger>
              <TabsTrigger className="flex items-center gap-1.5" value="yearly">
                {tCommon("labels.yearly")}
                <Badge size="sm" variant="success">
                  {t("save")}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {isBillingLoading
            ? BILLING_PLAN_SKELETON_KEYS.map((key) => (
                <BillingPlanCardSkeleton key={key} />
              ))
            : planGroups.map(renderPlanCard)}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("addons")}</h2>
        <ZdrAddonCard />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("invoices")}</h2>
        {customerLoading ? (
          <InvoiceTableSkeleton />
        ) : (
          <InvoicesTable invoices={invoices ?? []} plans={plans} />
        )}
      </div>
    </SettingsPane>
  );
}
