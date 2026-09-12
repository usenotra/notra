"use client";

import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";
import {
  OnboardingChecklistItem,
  OnboardingChecklistItems,
} from "@notra/ui/components/ui/onboarding-checklist";
import { Progress } from "@notra/ui/components/ui/progress";
import { SidebarGroup } from "@notra/ui/components/ui/sidebar";
import { cn } from "@notra/ui/lib/utils";
import { useSyncExternalStore } from "react";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { AGENT_RUN_REFETCH_INTERVAL_MS } from "@/constants/onboarding-agent";
import { localStorageKeys } from "@/constants/storage";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import {
  useOnboardingAgentRun,
  useOnboardingStatus,
} from "@/lib/hooks/use-onboarding";
import { geoOnboardingPath } from "@/utils/geo-paths";

const collapsedListeners = new Set<() => void>();

function subscribeToCollapsedStorage(callback: () => void) {
  collapsedListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    collapsedListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function setStoredCollapsed(storageKey: string, value: boolean) {
  localStorage.setItem(storageKey, String(value));
  for (const listener of collapsedListeners) {
    listener();
  }
}

export function SidebarOnboarding() {
  const { activeOrganization } = useOrganizationsContext();
  const orgId = activeOrganization?.id ?? "";
  const slug = activeOrganization?.slug ?? "";

  const { data: agentRun } = useOnboardingAgentRun(orgId);
  const agentRunning = agentRun?.running ?? false;
  const { data } = useOnboardingStatus(orgId, {
    refetchInterval: agentRunning ? AGENT_RUN_REFETCH_INTERVAL_MS : false,
  });
  const { data: customer } = useBillingCustomer({
    expand: ["subscriptions.plan"],
  });

  const storageKey = localStorageKeys.sidebarOnboardingCollapsed(orgId);
  const storedCollapsed = useSyncExternalStore(
    subscribeToCollapsedStorage,
    () => localStorage.getItem(storageKey),
    () => null
  );
  const hasCompletedStep =
    data?.hasBrandIdentity ||
    data?.hasIntegration ||
    data?.hasSchedule ||
    data?.hasGeoTracking;
  const collapsed =
    storedCollapsed === null ? !!hasCompletedStep : storedCollapsed === "true";

  const toggleCollapsed = () => {
    setStoredCollapsed(storageKey, !collapsed);
  };

  const hasActiveSubscription = customer?.subscriptions.some(
    (subscription) => !subscription.addOn && subscription.status === "active"
  );

  if (!data || data.onboardingCompleted || data.onboardingDismissed) {
    return null;
  }

  if (customer && !hasActiveSubscription) {
    return null;
  }

  const steps = [
    {
      label: "Set up brand identity",
      href: `/${slug}/brand/identity`,
      completed: data.hasBrandIdentity,
    },
    {
      label: "Add an integration",
      href: `/${slug}/integrations`,
      completed: data.hasIntegration,
    },
    {
      label: "Create a schedule",
      href: `/${slug}/automation/schedules`,
      completed: data.hasSchedule,
    },
    {
      label: "Track AI visibility",
      href: geoOnboardingPath(),
      completed: data.hasGeoTracking,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <SidebarGroup className="px-3 pb-2 group-data-[collapsible=icon]:hidden">
      <div
        className={cn(
          "duration-slow overflow-hidden transition-[background-color,border-color,border-radius] ease-out",
          collapsed ? "bg-transparent" : "bg-sidebar-accent/40 rounded-xl"
        )}
      >
        <button
          aria-label={collapsed ? "Expand Getting Started" : "Close"}
          className={cn(
            "duration-slow flex w-full cursor-pointer items-center gap-2 text-left transition-[padding,background-color,border-color,border-radius,color] ease-out",
            collapsed
              ? "text-muted-foreground hover:bg-muted rounded-md px-2 py-1.5 text-xs"
              : "bg-muted/50 text-foreground rounded-t-xl border-b px-3 py-3 text-sm"
          )}
          onClick={toggleCollapsed}
          type="button"
        >
          <span className="flex-1 truncate font-medium">
            Getting Started
            {collapsed && ` (${completedCount}/${steps.length})`}
          </span>
          {agentRunning && <BrailleLoader className="text-xs" />}
          <svg
            aria-hidden="true"
            className="size-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <title>{collapsed ? "Expand" : "Close"}</title>
            {collapsed ? (
              <path d="m18 15-6-6-6 6" />
            ) : (
              <path d="M18 6 6 18M6 6l12 12" />
            )}
          </svg>
        </button>

        <div
          aria-hidden={collapsed}
          className={cn(
            "duration-slow grid transition-[grid-template-rows] ease-out",
            collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          )}
          inert={collapsed}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="px-3 pt-3 text-sm font-medium">
              Complete these steps to get the most out of Notra.
            </div>
          </div>
        </div>

        <div
          className={cn(
            "duration-slow transition-[margin] ease-out",
            collapsed ? "mt-1" : "mx-3 mt-3"
          )}
        >
          <Progress className={cn(collapsed && "h-1")} value={progress} />
        </div>

        <div
          aria-hidden={collapsed}
          className={cn(
            "duration-slow grid transition-[grid-template-rows] ease-out",
            collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          )}
          inert={collapsed}
        >
          <div className="min-h-0 overflow-hidden">
            <p className="text-muted-foreground px-3 pt-1 text-xs tabular-nums">
              {Math.round(progress)}% Completed
            </p>
            <OnboardingChecklistItems className="px-3 pt-3 pb-3">
              {steps.map((step) => (
                <OnboardingChecklistItem
                  completed={step.completed}
                  href={step.href}
                  key={step.href}
                >
                  {step.label}
                </OnboardingChecklistItem>
              ))}
            </OnboardingChecklistItems>
          </div>
        </div>
      </div>
    </SidebarGroup>
  );
}
