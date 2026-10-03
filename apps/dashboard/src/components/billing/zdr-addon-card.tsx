"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Badge } from "@notra/ui/components/ui/badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useListPlans } from "autumn-js/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ZdrConsentDialog } from "@/components/billing/zdr-consent-dialog";
import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { PLANS_ANCHOR, ZDR_ADDON_ANCHOR } from "@/constants/billing";
import { flushTrackEvent, trackEvent } from "@/lib/analytics/posthog-client";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import { useHasZdrEntitlement } from "@/lib/hooks/use-plan";
import {
  findActivePlanSubscription,
  findZdrSubscription,
  formatUsd,
  getProductPrice,
  zdrAddonPlanId,
} from "@/utils/billing-plans";

export function ZdrAddonCard() {
  const t = useTranslations("billing.zdrAddon");
  const tBillingShared = useTranslations("billing.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { activeOrganization } = useOrganizationsContext();
  const {
    data: customer,
    isLoading: customerLoading,
    attach,
    updateSubscription,
    refetch,
  } = useBillingCustomer({ expand: ["subscriptions.plan"] });
  const { data: plans, isLoading: plansLoading } = useListPlans();
  const { hasZdr, isLoading: zdrLoading } = useHasZdrEntitlement();
  const [loading, setLoading] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);

  const activeSubscription = findActivePlanSubscription(
    customer?.subscriptions
  );
  const activePlanId =
    activeSubscription?.plan?.id ?? activeSubscription?.planId;
  const addonPlanId = zdrAddonPlanId(activePlanId);
  const addonPlan = plans?.find((plan) => plan.id === addonPlanId) ?? null;
  const zdrSubscription = findZdrSubscription(customer?.subscriptions);
  const price = getProductPrice(addonPlan);
  const priceLabel = formatUsd(price.amount, locale);
  const isLoading = customerLoading || plansLoading || zdrLoading;

  async function handleAdd() {
    if (!addonPlanId) {
      return;
    }
    setLoading(true);
    const successUrl = activeOrganization?.slug
      ? `${window.location.origin}/${activeOrganization.slug}/settings/billing`
      : undefined;
    try {
      const result = await attach({
        planId: addonPlanId,
        redirectMode: "if_required",
        successUrl,
      });
      if (result.paymentUrl) {
        await flushTrackEvent(POSTHOG_EVENTS.CHECKOUT_REDIRECTED, {
          plan_id: addonPlanId,
          zdr: true,
        });
        window.location.assign(result.paymentUrl);
        return;
      }
      await refetch();
      trackEvent(POSTHOG_EVENTS.ZDR_ADDON_ATTACHED, {
        plan_id: activePlanId ?? null,
        addon_plan_id: addonPlanId,
      });
      toast.success(tCommon("messages.zeroDataRetentionIsNow"));
    } catch (err) {
      trackEvent(POSTHOG_EVENTS.CHECKOUT_FAILED, {
        plan_id: addonPlanId,
        zdr: true,
      });
      toast.error(
        err instanceof Error
          ? err.message
          : tCommon("messages.couldNotAddZeroData")
      );
    }
    setLoading(false);
  }

  async function handleRemove() {
    if (!zdrSubscription) {
      return;
    }
    setLoading(true);
    try {
      await updateSubscription({
        planId: zdrSubscription.planId,
        cancelAction: "cancel_end_of_cycle",
      });
      await refetch();
      trackEvent(POSTHOG_EVENTS.ZDR_ADDON_REMOVED, {
        plan_id: activePlanId ?? null,
        addon_plan_id: zdrSubscription.planId,
      });
      toast.success(t("removeSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("removeFailed"));
    }
    setLoading(false);
  }

  function renderAction() {
    if (isLoading) {
      return <Skeleton className="h-9 w-32 rounded-md" />;
    }
    if (zdrSubscription) {
      return (
        <Button
          disabled={loading}
          onClick={handleRemove}
          size="sm"
          variant="outline"
        >
          {loading ? tCommon("states.loading") : tCommon("actions.remove")}
        </Button>
      );
    }
    if (hasZdr) {
      return null;
    }
    if (!(addonPlanId && addonPlan)) {
      return (
        <Button
          nativeButton={false}
          render={<Link href={`#${PLANS_ANCHOR}`} />}
          size="sm"
          variant="outline"
        >
          {t("choosePlan")}
        </Button>
      );
    }
    return (
      <Button disabled={loading} onClick={() => setConsentOpen(true)} size="sm">
        {loading
          ? tCommon("states.loading")
          : t("addFor", { price: priceLabel, interval: price.interval })}
      </Button>
    );
  }

  let badge = <Badge variant="outline">{tCommon("labels.addOn")}</Badge>;
  if (hasZdr || zdrSubscription) {
    badge = <Badge>{tCommon("states.active")}</Badge>;
  }

  return (
    <TitleCard
      action={badge}
      className="scroll-mt-24"
      heading={tBillingShared("zeroDataRetention")}
      id={ZDR_ADDON_ANCHOR}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-1">
          <p className="text-muted-foreground text-sm">
            {addonPlanId || hasZdr || isLoading
              ? t("description")
              : t("unavailable")}
            <span className="text-muted-foreground/70"> {t("hint")}</span>
          </p>
        </div>
        {renderAction()}
      </div>
      <ZdrConsentDialog
        onConfirm={handleAdd}
        onOpenChange={setConsentOpen}
        open={consentOpen}
      />
    </TitleCard>
  );
}
