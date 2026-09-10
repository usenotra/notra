"use client";

import {
  ADDONS,
  FEATURES,
  TOPUP_MAX_DOLLARS,
  TOPUP_MIN_DOLLARS,
  TOPUP_PRESETS,
} from "@notra/ai/billing/features";
import { MARKUP_PERCENT } from "@notra/ai/billing/token-pricing";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Input } from "@notra/ui/components/ui/input";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";

function formatDollars(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

interface CreditTopupContentProps {
  onSuccess?: () => void;
}

export function CreditTopupContent({ onSuccess }: CreditTopupContentProps) {
  const { activeOrganization } = useOrganizationsContext();
  const {
    attach,
    data: customer,
    isLoading,
    refetch,
  } = useBillingCustomer({
    expand: ["balances.feature"],
  });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const aiCredits = customer?.balances?.[FEATURES.AI_CREDITS];
  const aiCreditsBalance =
    typeof aiCredits?.remaining === "number" ? aiCredits.remaining : null;
  const aiCreditsIncluded =
    typeof aiCredits?.granted === "number" ? aiCredits.granted : null;

  const parsedCustom = Number.parseInt(customAmount, 10);
  const isCustomValid =
    isCustom &&
    !Number.isNaN(parsedCustom) &&
    Number.isInteger(parsedCustom) &&
    parsedCustom >= TOPUP_MIN_DOLLARS &&
    parsedCustom <= TOPUP_MAX_DOLLARS;

  let activeAmount: number | null = selected;
  if (isCustom) {
    activeAmount = isCustomValid ? parsedCustom : null;
  }
  const openedTrackedRef = useRef(false);

  useEffect(() => {
    if (openedTrackedRef.current) {
      return;
    }
    openedTrackedRef.current = true;
    trackEvent(POSTHOG_EVENTS.CREDITS_TOPUP_OPENED);
  }, []);

  async function handleTopup() {
    if (!activeAmount) {
      return;
    }
    const amountDollars = activeAmount;
    const isPreset = !isCustom;
    setLoading(true);
    const successUrl = activeOrganization?.slug
      ? `${window.location.origin}/${activeOrganization.slug}/settings/credits?success=true`
      : undefined;
    try {
      const credits = activeAmount * 100;

      const result = await attach({
        planId: ADDONS.AI_CREDITS_TOPUP,
        featureQuantities: [
          { featureId: FEATURES.AI_CREDITS, quantity: credits },
        ],
        redirectMode: "if_required",
        successUrl,
      });

      if (result.paymentUrl) {
        trackEvent(POSTHOG_EVENTS.CHECKOUT_REDIRECTED, {
          plan_id: ADDONS.AI_CREDITS_TOPUP,
          amount_dollars: amountDollars,
          is_preset: isPreset,
        });
        window.location.assign(result.paymentUrl);
      } else {
        await refetch();
        trackEvent(POSTHOG_EVENTS.CREDITS_TOPUP_COMPLETED, {
          amount_dollars: amountDollars,
          is_preset: isPreset,
        });
        toast.success("Credits added successfully");
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      trackEvent(POSTHOG_EVENTS.CHECKOUT_FAILED, {
        plan_id: ADDONS.AI_CREDITS_TOPUP,
        amount_dollars: amountDollars,
        is_preset: isPreset,
      });
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not process top-up. Please try again."
      );
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {isLoading ? (
        <Skeleton className="h-16 rounded-lg" />
      ) : (
        <div className="bg-muted/30 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Current Balance</p>
          <p className="text-2xl font-bold tabular-nums">
            {aiCreditsBalance !== null ? formatDollars(aiCreditsBalance) : "-"}
          </p>
          {aiCreditsIncluded !== null && (
            <p className="text-muted-foreground text-xs">
              of {formatDollars(aiCreditsIncluded)} included in plan
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Select amount</p>
        <div className="grid grid-cols-4 gap-2">
          {TOPUP_PRESETS.map((amount) => (
            <button
              className={cn(
                "rounded-lg border py-2.5 text-sm font-medium transition-colors",
                !isCustom && selected === amount
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-accent"
              )}
              disabled={loading}
              key={amount}
              onClick={() => {
                setSelected(amount);
                setIsCustom(false);
              }}
              type="button"
            >
              ${amount}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-xs">or</span>
          <div className="bg-border h-px flex-1" />
        </div>

        <div className="relative">
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            $
          </span>
          <Input
            className={cn(
              "pl-7",
              isCustom && isCustomValid && "border-primary"
            )}
            max={TOPUP_MAX_DOLLARS}
            min={TOPUP_MIN_DOLLARS}
            onChange={(e) => {
              setCustomAmount(e.target.value.replace(/\./g, ""));
              setIsCustom(true);
              setSelected(null);
            }}
            onFocus={() => {
              setIsCustom(true);
              setSelected(null);
            }}
            placeholder={`Custom amount ($${TOPUP_MIN_DOLLARS}–$${TOPUP_MAX_DOLLARS})`}
            step={1}
            type="number"
            value={customAmount}
          />
        </div>
        {isCustom && customAmount && !isCustomValid && (
          <p className="text-destructive text-xs">
            Enter a whole number between ${TOPUP_MIN_DOLLARS} and $
            {TOPUP_MAX_DOLLARS}
          </p>
        )}
      </div>

      <Button
        className="w-full"
        disabled={!activeAmount || loading}
        onClick={handleTopup}
      >
        {loading && <Loader2Icon className="size-4 animate-spin" />}
        {!loading && activeAmount && `Add $${activeAmount} in credits`}
        {!(loading || activeAmount) && "Select an amount"}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        A {MARKUP_PERCENT}% platform fee is added to top-ups. Plan-included
        credits are charged at cost.
      </p>
    </div>
  );
}
