"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Confetti } from "@neoconfetti/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/button";
import { CHECKOUT_SURFACES } from "@/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import { planDisplayName } from "@/utils/billing-plans";

function BillingSuccessPageContent() {
  const { slug } = useParams<{ slug: string }>();
  const { openCustomerPortal, data: customer } = useBillingCustomer({
    expand: ["subscriptions.plan"],
  });

  const activeSubscription = customer?.subscriptions?.find(
    (sub) => !sub.addOn && sub.status === "active"
  );
  const planName =
    planDisplayName(activeSubscription?.plan?.name) ?? "your new plan";
  const [now] = useState(() => Date.now());
  const completedRef = useRef(false);
  const activePlanId =
    activeSubscription?.plan?.id ?? activeSubscription?.planId ?? null;
  const isTrial =
    activeSubscription?.trialEndsAt != null &&
    activeSubscription.trialEndsAt > now;

  useEffect(() => {
    if (!activeSubscription || completedRef.current) {
      return;
    }
    completedRef.current = true;
    trackEvent(POSTHOG_EVENTS.CHECKOUT_COMPLETED, {
      plan_id: activePlanId,
      is_trial: isTrial,
    });
  }, [activeSubscription, activePlanId, isTrial]);

  async function handleManageBilling() {
    trackEvent(POSTHOG_EVENTS.CUSTOMER_PORTAL_OPENED, {
      surface: CHECKOUT_SURFACES.SUCCESS_PAGE,
    });
    try {
      await openCustomerPortal({
        returnUrl: `${window.location.origin}/${slug}?settings=billing`,
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not open billing portal. Please try again."
      );
    }
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2">
        <Confetti
          colors={[
            "var(--primary)",
            "#FFC700",
            "#FF6B6B",
            "#41BBC7",
            "#A78BFA",
            "#34D399",
          ]}
          duration={4000}
          force={0.6}
          particleCount={200}
          particleShape="mix"
          particleSize={10}
          stageHeight={1000}
          stageWidth={1600}
        />
      </div>

      <div className="flex max-w-md flex-col items-center text-center">
        <HugeiconsIcon className="text-success size-12" icon={Tick02Icon} />

        <h1 className="text-foreground mt-6 text-4xl font-bold tracking-tight">
          Payment Successful!
        </h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">
          Thanks for subscribing to {planName}. Your plan is active and all
          features are ready to use.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className={cn(buttonVariants({ variant: "default", size: "lg" }))}
            href={`/${slug}`}
          >
            Go to dashboard
          </Link>
          <button
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            onClick={handleManageBilling}
            type="button"
          >
            Manage billing
          </button>
        </div>

        <Link
          className="text-muted-foreground hover:text-foreground mt-6 text-sm underline underline-offset-4 transition-colors"
          href={`/${slug}?settings=billing`}
        >
          View invoices & usage
        </Link>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex flex-1 flex-col items-center justify-center gap-6 px-4"
          role="status"
        >
          <span className="sr-only">Loading billing confirmation</span>
          <Skeleton aria-hidden="true" className="size-12 rounded-full" />
          <Skeleton aria-hidden="true" className="h-10 w-full max-w-sm" />
          <Skeleton aria-hidden="true" className="h-12 w-full max-w-md" />
          <Skeleton aria-hidden="true" className="h-11 w-64" />
        </div>
      }
    >
      <BillingSuccessPageContent />
    </Suspense>
  );
}
